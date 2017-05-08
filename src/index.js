/**
 * Copyright 2016 Autodesk Inc. http://www.autodesk.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import theo from 'theo';
import loaderUtils from 'loader-utils';
import path from 'path';
import fs from 'fs';

const DEFAULT_TRANSFORM = 'web';
const DEFAULT_FORMAT = 'common.js';

module.exports = function theoLoader(content) {
    // Return any options to pass to the theo transform and format plugins for the given transform/format pair.
    const mergeOptions = (loaderOptions, queryOptions) => {
        const { getOptions, ...otherLoaderOptions } = loaderOptions;
        let options = {
            ...otherLoaderOptions,
            ...(queryOptions || {}),
        };

        if (typeof options.transform === 'string') {
            options.transform = {
                type: options.transform,
            };
        }

        if (typeof options.format === 'string') {
            options.format = {
                type: options.format,
            };
        }

        if (typeof getOptions === 'function') {
            options = getOptions(options);
        }

        return options;
    };

    // Recursively add dependencies on imported Design Tokens files
    const addImportDependencies = (jsonString, filePath) => {
        const imports = JSON.parse(jsonString).imports;

        if (!imports) {
            return;
        }

        imports.forEach((importPath) => {
            const importPathAbs = path.resolve(path.dirname(filePath), importPath);
            this.addDependency(importPathAbs);

            // Now add *this* file's dependencies
            addImportDependencies(fs.readFileSync(importPathAbs, 'utf8'), importPathAbs);
        });
    };

    // Return the output of theo as a Javascript module definition.
    const moduleize = (theoOutput, formatType) => {
        let moduleized;
        if (/js$/.test(formatType)) {
            // These are already javascripts modules, either CommonJS or AMD
            moduleized = theoOutput;
        } else {
            let moduleContent;
            if (/json$/.test(formatType)) {
                moduleContent = theoOutput;
            } else {
                // Export everything else as a string
                const escaped = theoOutput.replace(/\n/g, '\\n').replace(/"/g, '\\"');
                moduleContent = `"${escaped}"`;
            }
            moduleized = `module.exports = ${moduleContent};`;
        }
        return moduleized;
    };

    this.cacheable();
    const callback = this.async();

    let jsonContent;
    try {
        // Assume the content is a serialized module
        jsonContent = JSON.stringify(this.exec(content, this.resourcePath));
    } catch (e) {
        // Fall back to assuming its serialized JSON
        jsonContent = content;
    }

    // Add a dependency on each of the imported Design Tokens files, recursively
    try {
        addImportDependencies(jsonContent, this.resourcePath);
    } catch (e) {
        process.nextTick(() => {
            callback(e);
        });
        return;
    }

    // Parse the transform and format from the query in the request
    const query = this.query && loaderUtils.parseQuery(this.query);
    const { format, transform, ...otherMergedOptions } = mergeOptions(this.options.theo || {}, query);
    const transformType = (transform && transform.type) || DEFAULT_TRANSFORM;
    const formatType = (format && format.type) || DEFAULT_FORMAT;

    theo
        .convert({
            ...otherMergedOptions,
            transform: {
                ...(transform || {}),
                // theo will choke if file path does not end with ".json"
                file: this.resourcePath.replace(/\.[^.]+$/, '.json'),
                data: jsonContent,
                type: transformType,
            },
            format: {
                ...(format || {}),
                type: formatType,
            },
        })
        .then((result) => {
            // Convert the result into a JS module
            callback(null, moduleize(result, formatType));
        })
        .catch(callback);
};

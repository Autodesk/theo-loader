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

module.exports = function theoLoader(content) {
    // Return any options to pass to the theo transform and format plugins for the given transform/format pair.
    const getOptions = (transform, format) => {
        const options = {
            transformOptions: {},
            formatOptions: {},
        };
        if (this.options.theo && this.options.theo.outputFormats) {
            // Find an output format spec that has the same transform and format
            this.options.theo.outputFormats.some((outputFormat) => {
                if (outputFormat.transform === transform && outputFormat.format === format) {
                    options.transformOptions = outputFormat.transformOptions || {};
                    options.formatOptions = outputFormat.formatOptions || {};
                    return true;
                }
                return false;
            });
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

    // Return the output of the theo format plugin as a Javascript module definition.
    const moduleize = (theoOutput, format) => {
        let moduleized;
        if (/js$/.test(format)) {
            // These are already javascripts modules, either CommonJS or AMD
            moduleized = theoOutput;
        } else {
            let moduleContent;
            if (/json$/.test(format)) {
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

    // Parse the transform and format from the query in the request
    const query = this.query && loaderUtils.parseQuery(this.query);
    const transform = (query && query.transform) || 'web';
    const format = (query && query.format) || 'common.js';

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

    const { transformOptions, formatOptions } = getOptions(transform, format);

    theo
        .convert({
            transform: {
                ...transformOptions,
                // theo will choke if file path does not end with ".json"
                file: this.resourcePath.replace(/\.[^.]+$/, '.json'),
                data: jsonContent,
                type: transform,
            },
            format: {
                ...formatOptions,
                type: format,
            },
        })
        .then((result) => {
            // Convert the result into a JS module
            callback(null, moduleize(result, format));
        })
        .catch(callback);
};

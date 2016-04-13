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
import vinylSource from 'vinyl-source-stream';
import vinylBuffer from 'vinyl-buffer';

module.exports = function theoLoader(content) {
    // Create a vinyl stream from some file content and a path.
    //
    // Method taken from:
    // https://github.com/gulpjs/gulp/blob/master/docs/recipes/make-stream-from-buffer.md
    const bufferToStream = (buffer, filePath) => {
        const stream = vinylSource(filePath);

        // Write the raw content to the stream
        stream.write(buffer);

        // Close the stream on the next process loop
        process.nextTick(() => {
            stream.end();
        });

        return stream;
    };

    // Return any options to pass to the theo transform and format plugins for the given transform/format pair.
    const getOptions = (transform, format) => {
        let options = {
            transform: {},
            format: {},
        };
        if (this.options.theo && this.options.theo.outputFormats) {
            // Find an output format spec that has the same transform and format
            this.options.theo.outputFormats.some(outputFormat => {
                if (outputFormat.transform === transform && outputFormat.format === format) {
                    options = {
                        transform: outputFormat.transformOptions || {},
                        format: outputFormat.formatOptions || {},
                    };
                    return true;
                }
                return false;
            });
        }
        return options;
    };

    // Recursively add dependencies on imported Design Properties files
    const addImportDependencies = (jsonString, filePath) => {
        const imports = JSON.parse(jsonString).imports;

        if (!imports) {
            return;
        }

        imports.forEach(importPath => {
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
                const escaped = theoOutput
                    .replace(/\n/g, '\\n')
                    .replace(/"/g, '\\"');
                moduleContent = `"${escaped}"`;
            }
            moduleized = `module.exports = ${moduleContent};`;
        }
        return moduleized;
    };

    // Parse the transform and format from the query in the request
    const query = loaderUtils.parseQuery(this.query);
    const transform = query.transform || 'web';
    const format = query.format || 'json';

    this.cacheable();
    const callback = this.async();

    // Add a dependency on each of the imported Design Properties files, recursively
    try {
        addImportDependencies(content, this.resourcePath);
    } catch (e) {
        process.nextTick(() => {
            callback(e);
        });
        return;
    }

    const stream = bufferToStream(content, this.resourcePath);
    const options = getOptions(transform, format);

    stream
        .pipe(vinylBuffer())
        .pipe(theo.plugins.transform(transform, options.transform))
        .on('error', callback)
        .pipe(theo.plugins.format(format, options.format))
        .on('error', callback)
        .pipe(theo.plugins.getResult(result => {
            // Convert the result into a JS module
            callback(null, moduleize(result, format));
        }));
};

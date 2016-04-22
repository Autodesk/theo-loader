/* eslint-env mocha */
/* eslint-disable global-require */
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import sass from 'node-sass';
import webpack from 'webpack';
import Promise from 'bluebird';
import should from 'should';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures');
const OUTPUT_DIR = path.resolve(__dirname, 'temp');
const OUTPUT_BASENAME = 'main.js';
const OUTPUT_PATH = path.resolve(OUTPUT_DIR, OUTPUT_BASENAME);

const webpackConfigBase = {
    context: __dirname,
    output: {
        filename: OUTPUT_BASENAME,
        path: OUTPUT_DIR,
        libraryTarget: 'commonjs2',
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel',
            },
        ],
    },
};

const fixtureAbsPath = relPath => path.resolve(FIXTURE_PATH, relPath);
const loadFixture = relPath => fs.readFileSync(fixtureAbsPath(relPath)).toString();

describe('[theo-loader]', () => {
    beforeEach(done => {
        delete require.cache[OUTPUT_PATH];
        rimraf(OUTPUT_PATH, done);
    });

    it('should error on an invalid json file', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./invalid-json/entry.js'),
        };
        webpack(config, () => {
            (() => {
                require(OUTPUT_PATH);
            }).should.throw(/Cannot find module/);
            done();
        });
    });

    it('should error on an invalid Design Tokens file', done => {
        // The file may be valid JSON...
        const fixtureFileName = './invalid-design-props/props.json';
        const json = JSON.parse(loadFixture(fixtureFileName));
        json.should.be.a.Object();

        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./invalid-design-props/entry.js'),
        };
        webpack(config, () => {
            // ...but it's not a valid design tokens file
            (() => {
                require(OUTPUT_PATH);
            }).should.throw(/Cannot find module/);
            done();
        });
    });

    it('should recursively add dependencies', done => {
        const promise1 = new Promise(resolve => {
            const config = {
                ...webpackConfigBase,
                entry: fixtureAbsPath('./no-imports/entry.js'),
            };
            webpack(config, (err, stats) => {
                should(err).be.empty();
                stats.compilation.missingDependencies.should.be.empty();
                stats.compilation.fileDependencies.should.containDeep([
                    fixtureAbsPath('./no-imports/props.json'),
                ]);
                resolve();
            });
        });

        const promise2 = new Promise(resolve => {
            const config = {
                ...webpackConfigBase,
                entry: fixtureAbsPath('./non-nested-imports/entry.js'),
            };
            webpack(config, (err, stats) => {
                should(err).be.empty();
                stats.compilation.missingDependencies.should.be.empty();
                stats.compilation.fileDependencies.should.containDeep([
                    fixtureAbsPath('./non-nested-imports/props.json'),
                    fixtureAbsPath('./non-nested-imports/import.json'),
                ]);
                resolve();
            });
        });

        const promise3 = new Promise(resolve => {
            const config = {
                ...webpackConfigBase,
                entry: fixtureAbsPath('./nested-imports/entry.js'),
            };
            webpack(config, (err, stats) => {
                should(err).be.empty();
                stats.compilation.missingDependencies.should.be.empty();
                stats.compilation.fileDependencies.should.containDeep([
                    fixtureAbsPath('./nested-imports/props.json'),
                    fixtureAbsPath('./nested-imports/import.json'),
                    fixtureAbsPath('./nested-imports/nested-import.json'),
                ]);
                resolve();
            });
        });

        Promise.all([promise1, promise2, promise3])
            .then(() => {
                done();
            });
    });

    it('should generate an importable javascript module', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry.js'),
        };
        webpack(config, () => {
            let result;
            (() => {
                result = require(OUTPUT_PATH).default;
            }).should.not.throw();
            result.should.be.ok();
            done();
        });
    });

    it('should use transform: "web", format: "json" by default', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry.js'),
        };
        webpack(config, () => {
            const result = require(OUTPUT_PATH).default;
            result.should.be.a.Object();
            done();
        });
    });

    it('should be able to specify transform, format in the query parameters', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry-scss.js'),
        };
        webpack(config, () => {
            const result = require(OUTPUT_PATH).default;
            result.should.be.a.String();
            done();
        });
    });

    it('should successfully import "common.js" format', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry-commonjs.js'),
        };
        webpack(config, () => {
            const result = require(OUTPUT_PATH).default;
            result.should.be.a.Object();
            done();
        });
    });

    it('should successfully import "amd.js" format', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry-amdjs.js'),
        };
        webpack(config, () => {
            require(OUTPUT_PATH).default.should.be.ok();
            done();
        });
    });

    it('should successfully import "scss" format', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry-scss.js'),
        };
        webpack(config, () => {
            const sassContent = require(OUTPUT_PATH).default;
            const css = sass.renderSync({
                data: `${sassContent}a { background-color: $two; }`,
            }).css.toString();
            css.should.match(/^a\s+{\s+background-color: white;\s+}\s+$/);
            done();
        });
    });

    it('should accept format and transform options', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./nested-imports/entry.js'),
            theo: {
                outputFormats: [
                    {
                        transform: 'web',
                        format: 'json',
                        formatOptions: {
                            // Only return props with the type of 'color'
                            propsFilter: prop => prop.type === 'color',
                            // Prefix each prop name with 'PREFIX_'
                            propsMap: prop => {
                                prop.name = `PREFIX_${prop.name}`; // eslint-disable-line no-param-reassign
                                return prop;
                            },
                        },
                    },
                ],
            },
        };
        webpack(config, () => {
            const json = require(OUTPUT_PATH).default;
            json.PREFIX_five.should.equal('rgb(255, 0, 0)');
            done();
        });
    });

    it('should play nice with upstream loaders', done => {
        const config = {
            ...webpackConfigBase,
            entry: fixtureAbsPath('./non-json-import/entry.js'),
        };
        webpack(config, () => {
            const result = require(OUTPUT_PATH).default;
            result.should.have.property('five');
            done();
        });
    });
});

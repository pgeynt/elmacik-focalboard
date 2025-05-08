// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const merge = require('webpack-merge');
const path = require('path');

const makeCommonConfig = require('./webpack.common.js');

const commonConfig = makeCommonConfig();

const config = merge.merge(commonConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    optimization: {
        minimize: false,
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'pack'),
            publicPath: '/',
        },
        host: '0.0.0.0',
        port: 3000,
        historyApiFallback: {
            index: '/index.html',
        },
        hot: true,
        compress: true,
    },
});

module.exports = [
    merge.merge(config, {
        devtool: 'source-map',
        output: {
            devtoolNamespace: 'focalboard',
        },
    }),
];

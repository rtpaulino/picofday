#!/usr/bin/env node
'use strict';

var picOfTheDay = require('./picOfTheDay.js');

picOfTheDay()
    .then(res => {
        console.log(res);
    })
    .catch(err => {
        if (err.stack) {
            console.log(err.stack);
        } else {
            console.log(err);
        }
        process.exit(1);
    });

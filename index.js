#! /usr/bin/env node

let http  = require('http');
let https = require('https');
let fm    = require('feedme');
let noti  = require('node-notifier');
let fs    = require('fs');
let path  = require('path');
let os    = require('os');
let feedl = path.join(os.homedir(), '.feed_notify.txt');
let dbl   = path.join(os.homedir(), '.feed_notify.db');
let Ds    = require('nedb');
let db    = new Ds({ filename: dbl, autoload: true });
let cr    = require('crypto');

let list = fs
.readFileSync(feedl, { encoding : 'utf-8'})
.split('\n')
.map((line) => line.split(/\s/)[0].trim())
.filter((url) => url.indexOf('http') === 0);

global.index = 0;

if(process.argv[2] === 'build' || process.argv[3] == 'build')
{
    let timeout = 0;
    list.forEach((feed) =>
    {
        setTimeout
        (() =>
            {
                console.log('Getting', feed);
                process_one(feed, true)
                .catch((err) => console.error('Error:\n', err));
            },
            timeout
        );

        timeout += 500;
    });
}
else
{
    let init_interval = setInterval(() =>
    {
        process_one(list[global.index])
        .catch((err) => console.error('Error:\n', err));

        if(global.index + 1 === list.length)
        {
            global.index = 0;
            clearInterval(init_interval);
        }
        else ++global.index;
    }, 2 * 1000);

    setInterval(() =>
    {
        let every_some_sec = setInterval(() =>
        {
            process_one(list[global.index])
            .catch((err) => console.error('Error:\n', err));

            if(global.index + 1 === list.length)
            {
                global.index = 0;
                clearInterval(every_some_sec);
            }
            else ++global.index;
        }, 2 * 1000);
    }, 5 * 60 * 1000);
}


function process_one(url, dont_notify)
{
    return new Promise((resolve, reject) =>
    {
        (url.indexOf('https://') !== 0 ? http : https)
        .get(url, { headers: { 'User-Agent': '' } }, (res) =>
        {
            if(res.statusCode !== 200) return console.error('HTTP', res.statusCode);

            let parser = new fm(true);
            res.pipe(parser);

            parser.on('end', () =>
            {
                let data = parser.done();
                if(data.title.indexOf('Twitter Search / ') === 0)
                    data.title = data.title.substr(17);
                data.items.forEach((item) =>
                {
                    if(typeof(item.link) === 'object')
                        item.link = JSON.stringify(item.link);
                    db.insert
                    (
                        {
                            _id : cr.createHash('sha256')
                                  .update(`${item.link}${item.guid}${item.pubdate}`)
                                  .digest('base64')
                        },
                        (err) =>
                        {
                            if(!err)
                            {
                                if(!dont_notify) noti.notify
                                (
                                    {
                                        title : data.title,
                                        message : item.title + '\n' + item.link,
                                        wait : false,
                                        sound : false
                                    },
                                    (err) =>
                                    {
                                        if(err) console.error('Error:\n', err);
                                    }
                                );
                            }
                            else if(err.errorType !== 'uniqueViolated')
                            {
                                console.error('Error:\n', err);
                            }
                        }
                    );
                });

                delete data;
            });
        })
        .on('error', (err) => console.error(err));
    })
    .catch((err) =>
    {
        console.error('Error:\n', err);
    });
}
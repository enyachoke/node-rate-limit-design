'use strict';

const Hapi = require('hapi');
const Boom = require('boom')
const moment = require('moment')
const asyncRedis = require("async-redis");
const client = asyncRedis.createClient(process.env.REDIS_URL);
const { createPlugin, getSummary } = require('@promster/hapi');
// Create a server with a host and port  
const server = Hapi.server({
    host: '0.0.0.0',
    port: process.env.PORT || 8000
});

const customAuth = {
    name: 'customAuth',
    version: '1.0.0',
    register(server, options) {
        server.auth.scheme('mock', (server, options) => {
            return {
                authenticate(request, h) {
                    return h.authenticated({ credentials: options })
                }
            }
        });
    }
};
const checkPerSecond = async (user) => {
    const key = user.name + 'checkMinute';
    let result = {};
    const value = await client.exists(key);
    if (value === 1) {
        const redisValue = await client.get(key);
        let data = JSON.parse(redisValue)
        let currentTime = moment().unix()
        let difference = (currentTime - data.startTime)
        if (difference > 1) {
            console.log(difference);
            let body = {
                'count': 1,
                'startTime': moment().unix()
            }
            await client.set(key, JSON.stringify(body))
            // allow the request
            // console.log('Allow request')
            return { status: 'allow' };
        }
        if (difference <= 1) {
            // console.log(user.ratePerSecond)
            if (data.count >= user.ratePerSecond) {
                console.log('Reject request')
                // return res.json({ "error": 1, "message": "throttled limit exceeded..." })
                return { status: 'reject', "message": `Per Second limit limit of ${user.ratePerSecond} exceeded` }
            }
            // update the count and allow the request
            data.count++
            await client.set(key, JSON.stringify(data))
            // allow request
            return { status: 'allow' };

        }
        //console.log('Test Value')
    } else {
        // add new user
        let body = {
            'count': 1,
            'startTime': moment().unix()
        }
        await client.set(key, JSON.stringify(body))
        // allow request
        // console.log('Allow request')
        return { status: 'allow' };
    }
    return result;
}

const checkMonthly = async (user) => {
    const key = user.name + 'checkMonthly';
    let result = {};
    const value = await client.exists(key);
    if (value === 1) {
        const redisValue = await client.get(key);
        let data = JSON.parse(redisValue)
        let currentTime = moment().unix()
        let difference = (currentTime - data.startTime)
        let monthSecond = 60 * 60 * 24 * 30;
        if (difference > monthSecond) {
            console.log(difference);
            let body = {
                'count': 1,
                'startTime': moment().unix()
            }
            await client.set(key, JSON.stringify(body))
            return { status: 'allow' };
        }
        if (difference <= monthSecond) {
            if (data.count >= user.ratePerMonth) {
                return { status: 'reject', "message": `Monthly limit of ${user.ratePerMonth} exceeded` }
            }
            data.count++
            await client.set(key, JSON.stringify(data))
            return { status: 'allow' };

        }
    } else {
        let body = {
            'count': 1,
            'startTime': moment().unix()
        }
        await client.set(key, JSON.stringify(body))
        return { status: 'allow' };
    }
    return result;
}

const quotaPlugin = {
    name: 'quotaPlugin',
    version: '1.0.0',
    register: async function (server, options) {

        server.ext({
            type: 'onPostAuth',
            method: async function (request, h) {
                const secondResult = await checkPerSecond(request.auth.credentials);
                const monthlyResult = await checkMonthly(request.auth.credentials);
                if (secondResult.status == 'reject') {
                    throw Boom.tooManyRequests(secondResult.message)
                }

                if (monthlyResult.status == 'reject') {
                    throw Boom.tooManyRequests(monthlyResult.message)
                }
                return h.continue;
            }
        });
    }
};

server.register(customAuth)
server.auth.strategy('testing-strategy', 'mock', { id: 1, name: 'baby-matt', ratePerSecond: 5, ratePerMonth: 100 });
// Add the route  
server.route({
    method: 'GET',
    path: '/hello',
    options: { auth: 'testing-strategy' },
    handler: function (request, h) {
        return {message: `Howdy from ${process.env.INSTANCE}`};
    }
});

server.route({
    method: 'GET',
    path: '/metrics',
    handler: function (request, h) {
        return getSummary();
    }
});

// Start the server  
async function start() {
    await server.register(createPlugin({}))
    await server.register(quotaPlugin)
    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at:', server.info.uri);
};

start();
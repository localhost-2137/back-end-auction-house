const path = require('path');
import dotenv from 'dotenv';
dotenv.config();

const CORS = require('cors');
const jwt = require('jsonwebtoken');
import express from 'express';
const geoLib = require('geolib');
const pgp = require("pg-promise")();
const app = express();


const {
    PORT = 3000,
    DATABASE_URL
} = process.env;


const server = require('http').createServer(app);

const db = pgp(DATABASE_URL);

async function bootstrap() {

    const jwtDecodeMiddleware = require('./lib/jwt-decode-middleware');
    const isLoggedMid = await require('./lib/jwt-is-logged-in-checker')();

    const indexController = require('./controllers/index.controller');
    const usersController = require('./controllers/users.controller');
    const listingsController = require('./controllers/listings.controller');

    app.use(express.json());


    const packages = {
        express,
        db,
        jwt,
        geoLib,
        isLoggedMid
    }

    app.use(CORS({
        origin: "*"
    }));

    app.use('/', await jwtDecodeMiddleware(packages));
    app.use('/', await indexController(express, db));
    app.use('/users', await usersController(packages));
    app.use('/listings', await listingsController(packages));

    server.listen(PORT, () => {
        console.log(`Server is listening on PORT: ${PORT}...`);
    });
}
bootstrap()
    .catch(console.error);
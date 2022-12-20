import {Request} from "express";

const {v4: uuidv4} = require('uuid');
import {IDatabase} from "pg-promise";

const sha512 = require('js-sha512');
const twofactor = require("node-2fa");

import {FMail} from '../lib/fmail';

const fmail = new FMail("http://vps.filipton.space:8656", "admin", "AdminPassw0rd1277410641");

module.exports = async function (packages: any) {
    const {
        SECRET
    } = process.env;

    const {express, db, jwt} = packages;
    const Router = express.Router();

    Router.get('/', function (req: any, res: any) {
        res.send('users');
    });

    Router.get('/:username', async (req: any, res: any) => {
        const {username} = req.params;
        console.log(username);
        await db.one("SELECT id, firstname, lastname, username, created_at FROM Users WHERE username = $1", [username])
            .then(async (user: any) => {
                console.log(user);
                let lists = await db.any("SELECT * FROM listings as l WHERE l.owner_id = $1", [user.id]);
                res.status(200).json({
                    firstname: user.firstname,
                    lastname: user.lastname,
                    created_at: user.created_at,
                    data: lists
                });
            })
            .catch(() => {
                res.status(404).send("User not found");
            });
    });

    Router.post('/signup', async function (req: any, res: any) {
        let verificationCode: any = uuidv4();

        const {username, email, password, firstname, lastname, localization, tfa} = req.body;
        const secondsSinceEpoch = Math.round(Date.now() / 1000);


        let secret: any = {};
        if (tfa) {
            const newSecret = twofactor.generateSecret({name: "Auction House", account: username});
            secret = newSecret;
        }


        await db.none("INSERT INTO Users " +
            "(username, email, password, firstname, lastname, localization, created_at, verification, verified, tfa) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [username, email, sha512(password), firstname, lastname, localization, secondsSinceEpoch, verificationCode, false, secret.secret])
            .then(async () => {
                await fmail.send("fwverify", {
                    emails: [email],
                    isBodyHTML: true,
                    subject: "Account verification",
                    content: `Verify your account clicking that link: <a href="http://172.16.15.202:3000/users/verify/${verificationCode}">http://172.16.15.202/users/verify/${verificationCode}</a>`,
                    displayName: "Account Verification"
                });

                return res.status(200).json(secret);
            })
            .catch((e: any) => {
                console.error(e);
                return res.status(500).send("ERROR");
            });
    });

    Router.get('/verify/:code', async function (req: any, res: any) {
        const {code} = req.params;

        await db.one("UPDATE Users SET verified = true WHERE verified = false AND verification = $1 RETURNING id", [code])
            .then(() => {
                return res.status(200).send("VERIFIED.... RETURN TO MAIN PAGE");
            })
            .catch(() => {
                return res.status(500).send("ERROR");
            });
    });

    Router.post('/signin', async function (req: any, res: any) {
        const {email, password, tfa} = req.body;

        if (!email.includes('@') || !email.includes('.') || !(email.length >= 5)) return res.status(400).send('bad email');
        //if(password.length === 0) return res.status(400).send('password is too short');

        await db.one("SELECT id, email, firstname, lastname, localization, tfa, username, created_at FROM Users WHERE email = $1 AND password = $2",
            [email, sha512(password)])
            .then((user: any) => {
                if (user.tfa) {
                    if (!tfa) return res.status(400).send("SEND 2FA");

                    const {delta} = twofactor.verifyToken(user.tfa, tfa);
                    if (delta < 0) return res.status(401).send("BAD 2FA");
                }

                return res.status(200).json({
                    token: jwt.sign({data: user}, SECRET)
                });
            })
            .catch(() => {
                return res.status(500).send("ERROR");
            });
    });

    return Router;
};
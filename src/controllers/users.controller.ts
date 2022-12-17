import {Request} from "express";

const { v4: uuidv4 } = require('uuid');
import {IDatabase} from "pg-promise";

const sha512 = require('js-sha512');
const twofactor = require("node-2fa");

import { FMail } from '../lib/fmail';
const fmail = new FMail("http://vps.filipton.space:8656", "admin", "AdminPassw0rd1277410641");

module.exports = async function (packages: any) {
    const {
        SECRET
    } = process.env;

    const { express, db, jwt } = packages;
    const Router = express.Router();

    Router.get('/', function (req: any, res: any) {
        res.send('users');
    });

    Router.post('/signup', async function (req: any, res: any) {
        let verificationCode: string = uuidv4();

        const { username, email, password, firstname, lastname, localization, tfa } = req.body;
        const secondsSinceEpoch = Math.round(Date.now() / 1000);

        let secretKey;
        if(tfa) {
            const newSecret = twofactor.generateSecret({ name: "Auction House", account: username });
        }

        await db.none("INSERT INTO Users " +
            "(username, email, password, firstname, lastname, localization, created_at, verification, verified, tfa) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [username, email, sha512(password), firstname, lastname, localization, secondsSinceEpoch, verificationCode, false])
            .then(async () => {
                await fmail.send("fwverify", {
                    emails: [email],
                    isBodyHTML: true,
                    subject: "Account verification",
                    content: `Verify your account clicking that link: <a href="loremipsum/${verificationCode}">loremipsum/${verificationCode}</a>`,
                    displayName: "Account Verification"
                });

                return res.status(200).send("OK");
            })
            .catch((e: any) => {
                return res.status(500).send("ERROR");
            });
    });

    Router.get('/verify/:code', async function (req: any, res: any) {
        const { code } = req.params;

        await db.one("UPDATE Users SET verified = true WHERE verified = false AND verification = $1 RETURNING id", [code])
            .then(() => {
                return res.status(200).send("VERIFIED.... RETURN TO MAIN PAGE");
            })
            .catch(() =>{
               return res.status(500).send("ERROR");
            });
    });

    Router.post('/signin', async function (req: any, res: any) {
        const { email, password } = req.body;

        await db.one("SELECT id, email, firstname, lastname, localization, postcode FROM Users WHERE email = $1 AND password = $2",
            [email, sha512(password)])
            .then((user: any) =>{
                //TODO: Zrób poniżej
                const signedToken = jwt.sign({
                    data: user
                }, SECRET);
                return res.status(200).json({
                    token: signedToken
                });
            })
            .catch(() =>{
               return res.status(500).send("ERROR");
            });
    });

    return Router;
};
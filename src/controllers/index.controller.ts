import {IDatabase} from "pg-promise";

module.exports = async function (express: any, db: IDatabase<any>) {
    const Router = express.Router();
    Router.get('/', function (req: any, res: any) {
        res.send('<h1>Nie no, skąd się wziąłeś tutej</h1>' +
            'nie powinieneś tego w ogóle widzieć');
    });

    return Router;
};
module.exports = async function (packages: any) {
    const {
        express,
        db,
        geoLib,
        isLoggedMid
    } = packages;
    const DEFAULT_EXPIRATION: number = parseInt(process.env.DEFAULT_EXPIRATION as string) || 30 * 24 * 60 * 60;

    const Router = express.Router();

    Router.get('/', async (req: any, res:any) => {
        let {
            lat: latitude,
            lon: longitude,
            cat
        } = req.query;

        cat = cat || -1;
        if(!latitude || !longitude)  [latitude, longitude] = ["52.2297", "21.0122"];


        await db.any("SELECT u.firstname, u.lastname, u.username, l.id, l.name, l.category, " +
            "l.expiration_date, l.top_bid, l.price, l.is_auction, l.localization " +
            "FROM listings AS l " +
            "INNER JOIN users u on u.id = l.owner_id " +
            "WHERE $1 = -1 OR l.category = $1", [cat])
            .then((data: any[]) => {
                data.forEach((e: any, index: number) => {
                    e.latitude = e.localization.lat;
                    e.longtidute = e.localization.lon;
                });

                data = geoLib.orderByDistance({latitude, longitude}, data).reverse();
                data.forEach((_, index: number) => {
                    delete data[index].latitude;
                    delete data[index].longtidute;
                });

                return res.status(200).json(data);
            })
            .catch((err: any) =>{
                console.error(err);
                return res.status(400).send("ERROR");
            });
    });

    Router.get('/:id', async (req: any, res:any) => {
        await db.one("SELECT * FROM Listings WHERE id = $1", [req.params.id])
            .then((data: any) => {
                return res.status(200).json(data);
            })
            .catch(() =>{
                return res.status(400).send("ERROR");
            });
    });

    Router.put('/', isLoggedMid, async (req: any, res: any) => {
        let {
            name,
            description,
            category,
            isAuction,
            bidPrice,
            price,
            localization
        } = req.body;
        localization = localization || req.body.token.localization;
        console.log(localization);

        const { id } = req.body.token;
        const currentDate = Math.floor(Date.now() / 1000);

        await db.one(
            "INSERT INTO Listings " +
            "(owner_id, name, description, category, created_at, expiration_date, is_auction, top_bid, price, localization) " +
            "VALUES ($1, $2, $3 ,$4, $5, $6, $7, $8, $9, $10) RETURNING id",

            [id, name, description, category, currentDate, currentDate + DEFAULT_EXPIRATION, isAuction, bidPrice, price, localization]
        )
            .then((data: any) => {
                const id = data.id;
                // res.redirect(``);
                return res.status(200).send(`${id}`);
            })
            .catch((err: any) => {
                console.log(err);
                return res.status(400).send('');
            });
    });


    Router.get('/bids/:id', async (req: any, res: any) => {
        const num = req.query.num || 10;

        await db.any("SELECT * FROM Bids WHERE listing_id = $1 ORDER BY id DESC LIMIT $2", [req.params.id, num])
            .then((data: any) => {
                return res.status(200).json(data);
            })
            .catch(() =>{
                return res.status(400).send("ERROR");
            });
    });

    Router.put('/bids/:id', isLoggedMid, async (req: any, res: any) => {
        const { top_bid } = await db.one("SELECT * FROM Listings WHERE id = $1", [req.params.id]);
        const { bid, token } = req.body;

        const currentDate = Math.floor(Date.now() / 1000);

        if(bid == undefined || bid <= top_bid) return res.status(400).send("Too small bid");
        await db.any("INSERT INTO Bids (listing_id, owner_id, price, bid_date) " +
                     "VALUES ($1, $2, $3, $4); " +

                     "UPDATE Listings SET top_bid = $3 " +
                     "WHERE id = $1", [req.params.id, token.id, bid, currentDate])
            .then((data: any) => {
                return res.status(200).send("OK!");
            })
            .catch(() =>{
                return res.status(400).send("ERROR");
            });
    });

    return Router;
};
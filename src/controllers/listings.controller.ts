import e from "express";

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
            "l.expiration_date, l.top_bid, l.price, l.is_auction, l.localization, l.image_link " +
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
            image_link,
            localization
        } = req.body;
        localization = localization || req.body.token.localization;

        const { id } = req.body.token;
        const currentDate = Math.floor(Date.now() / 1000);

        await db.one(
            "INSERT INTO Listings " +
            "(owner_id, name, description, category, created_at, expiration_date, is_auction, top_bid, price, localization, image_link) " +
            "VALUES ($1, $2, $3 ,$4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",

            [id, name, description, category, currentDate, currentDate + DEFAULT_EXPIRATION, isAuction, bidPrice, price, localization, image_link]
        )
            .then((data: any) => {
                const id = data.id;
                // res.redirect(``);
                return res.status(200).send(`${id}`);
            })
            .catch((err: any) => {
                console.log(err);
                return res.status(400).send(err);
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

    Router.put('/favourites', isLoggedMid, (req: any, res: any) => {
        const {
            listingId,
            token
        } = req.body;

        if(!listingId)
            return res.status(400).send('listingId cannot be null');

        db.none("INSERT INTO favourites (user_id, listing_id) VALUES ($1, $2)",
            [token.id, listingId])
            .catch((err: any) => {
                console.error(err);
                return res.status(500).send("Unknown error");
            });
        res.status(200).send('Successfully added to favourites');
    });

    Router.get('/favourites', isLoggedMid, (req: any, res: any) => {
        const {
            token
        } = req.body;

        db.one("SELECT * FROM favourites AS f RIGHT JOIN listings AS l ON f.user_id = l.owner_id WHERE f.user_id = $1", [token.id])
            .then((data: any) => {
                res.status(200).send(data);
            })
            .catch((err: any) => {
                console.error(err);
                return res.status(500).send("Unknown error");
            });
    });

    Router.delete('/', isLoggedMid, async (req: any, res: any) => {
        const {
            listingId,
            token
        } = req.body;

        await db.none("DELETE FROM listings AS l WHERE l.id = $1 AND l.owner_id = $2", [listingId, token.id])
            .then(() => {
                res.status(200).send('works');
            })
            .catch((err: any) => {
                console.error(err);
                return res.status(500).send("Unknown Error");
            });
        /*
        await db.one("SELECT l.owner_id FROM listings AS l WHERE l.id = $1", [listingId])
            .then((data: any) => {
                console.log(data.owner_id);
                if(data.owner_id != token.id)
                    return res.status(400).send("You cannot delete auction which doesn't belong to you");

                try {
                    db.none("DELETE FROM listings AS l WHERE l.id = $1", [listingId]);
                } catch (err) {
                    console.error(err);
                    return  res.status(500).send("Unknown Error");
                }
                res.status(200).send('successfully deleted');
            })
         */
    });

    Router.post('/buy/:id')

    return Router;
};
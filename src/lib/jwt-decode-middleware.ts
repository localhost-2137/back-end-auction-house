module.exports = async function (packages: any) {
    const { jwt } = packages;
    const { SECRET } = process.env;

    return async (req: any, res: any, next: any) => {
        const { token } = req.headers;

        if(token) {
            try {
                const jwtData = jwt.verify(token, SECRET);
                req.body.token = jwtData.data;
            } catch (err) {
                console.log(err, "\n\n code still works btw");
                res.status(400).send("ERROR: wrong authorization (wrong jwt token)");
            }
        }
        next();
    }
}
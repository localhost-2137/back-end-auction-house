module.exports = async function () {
    return (req: any, res: any, next: any) => {
        if(!req.body.token)
            return res.status(400).send('You need to login');
        next();
    }
}
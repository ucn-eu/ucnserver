var express = require('express');
var router = express.Router();
router.all('/', function(req, res, next) {
    return res.render('index', res.locals.renderobj)
});
module.exports = router;

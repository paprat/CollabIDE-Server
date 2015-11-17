var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    //console.log(new );
    res.render('index', {title: 'Testing'});
});

module.exports = router;

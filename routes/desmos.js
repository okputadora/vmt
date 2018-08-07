const axios = require('axios')
const express = require('express')
const router = express.Router()
router.get('/', (req, res, next) => {
	axios({
    method: 'GET',
    url: "https://www.desmos.com/calculator/r7uuazp5ow",
    headers: {'Accept': 'application/json'}
  })
  .then(result => {
		res.json({
	    confirmation: 'success',
	    result: result.data
	  })
	})
	.catch(err => {
		res.status(404).json({
			confirmation: 'fail',
			errorMessage: err
		})
	})
})


module.exports = router;

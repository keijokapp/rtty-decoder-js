const path = require('path');
const express = require('express');
const morgan = require('morgan');
const babelify = require('express-babelify-middleware');

const app = module.exports = express();

app.use(morgan('dev'));

app.get('/', (req, res, next) => {
	res.sendFile(path.resolve(__dirname + '/../index.html'));
});

app.get('/app.js', babelify(__dirname + '/../js/app.js'))

// catch 404 and forward to error handler
app.use((req, res, next) => {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500);
	res.send({
		message: err.message,
		error: err
	});
});

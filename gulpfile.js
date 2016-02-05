var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');

var bundler = watchify(
	browserify({
		entries: './src/app.js',
		debug: true,
	}, watchify)
	.transform(babelify.configure({
		presets: [
			'es2015',
			'stage-0'
		]
	}))
);

gulp.task('build', function() {
	return bundler
		.bundle()
		.on('error', function(err) {
			console.log('Error:', err.message);
			this.emit('end');
		})
		.pipe(fs.createWriteStream("./dist/app.js"));
});

gulp.task('watch', [ 'build' ], function() {
	bundler.on('update', function() {
		gulp.start('build');
	});
});

gulp.task('default', function() {
	gulp.start('watch');
});


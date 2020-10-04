/*
 *	Copyright (c) 2019 Alexander Pankratov, <ap@swapped.ch>
 *	https://github.com/apankrat/js-noisy-gradient
 *
 *      Distributed under the terms of the 2-clause BSD license. 
 *      https://www.opensource.org/licenses/bsd-license.php
 */

function NoisyVerticalGradient(w, h, stops, opts)
{
	if (typeof Object.assign != 'function')
	{
		/* don't bother, it's IE */
		this.render_png = function() { return null; }
		return;
	}

	this.w = w;
	this.h = h;

	this.stops = stops;

	this.defs = { cover: 1.0, white: 0.015, black: 0.030, canvas_fallback: false };
	this.opts = Object.assign(this.defs, opts);

	this.canvas = null;
	this.ctx_2d = null;
	this.ctx_gl = null;
	this.program = null;
	this.v_shader = null;
	this.f_shader = null;

	//
	this.render = function()
	{
		var c;

		if (typeof Object.assign != 'function')
			return null;

		//
		c = document.createElement('canvas');
		if (! c)
			return null;

		c.width  = this.w;
		c.height = this.h;

		this.canvas = c;

		//
		this.ctx_gl = c.getContext('webgl');
		if (this.ctx_gl && this.render_webgl())
			return c;

		if (! this.opts.canvas_fallback)
			return null;

		//
		this.ctx_2d = c.getContext('2d');
		if (this.ctx_2d && this.render_basic())
			return c;

		return null;
	}

	this.render_png = function()
	{
		if (! this.render())
			return null;
		
		var png = this.canvas.toDataURL("image/png");
		return 'url(' + png + ')';
	}

	//
	this.render_webgl = function()
	{
		var opts = this.opts;

		var c = this.canvas;
		var gl = this.ctx_gl;

		if (! gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT))
			return false;

		var stops = this.parseStops(this.stops);
		if (! stops)
			return false;

		//
		this.initShaders();

		var vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, this.v_shader);
		gl.compileShader(vs);

		if (! gl.getShaderParameter(vs, gl.COMPILE_STATUS))
		{
			console.log(gl.getShaderInfoLog(vs));
			return false;
		}

		var fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, this.f_shader);
		gl.compileShader(fs);

		if (! gl.getShaderParameter(fs, gl.COMPILE_STATUS))
		{
			console.log(gl.getShaderInfoLog(fs));
			return false;
		}

		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);

		if (! gl.getProgramParameter(program, gl.LINK_STATUS))
		{
			console.log(gl.getProgramInfoLog(program));
			return false;
		}

		this.program = program;

		//
		var wf = (c.width < c.height) ? 1 : c.width / c.height;
		var hf = (c.width > c.height) ? 1 : c.height / c.width;

		var vertices = new Float32Array
		([
			-wf, hf,  wf,  hf,  wf, -hf, // 1st triangle
			-wf, hf,  wf, -hf, -wf, -hf  // 2nd triangle
		]);

		var vbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		var itemSize = 2;
		var numItems = vertices.length / itemSize;

		//
		gl.useProgram(program);

		//
		var uniforms =
		{
			'u_canvas' : [c.width, c.height],
			'u_cover'  : opts.cover,
			'u_white'  : opts.white,
			'u_black'  : opts.black,
			'u_stops'  : stops
		};

		this.createUniforms(uniforms);

		//
		var l = gl.getAttribLocation(program, "a_vertex_pos");
		gl.enableVertexAttribArray(l);
		gl.vertexAttribPointer(l, itemSize, gl.FLOAT, false, 0, 0);

		//
		gl.drawArrays(gl.TRIANGLES, 0, numItems);

		return true;
	}

	this.render_basic = function()
	{
		var opts = this.opts;
		var stops = this.stops;

		var c = this.canvas;
		var ctx = this.ctx_2d;

		var w = c.width;
		var h = c.height;

		var g = ctx.createLinearGradient(0,0,0,h);
		for (var stop in stops)
			g.addColorStop(stop, stops[stop]);
    
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);

		for (var x=0; x<w; x++)
		{
			for (var y=0; y<h; y++)
			{
				if (opts.cover < Math.random())
					continue;

				var f = 1 - 2*Math.random();
				var c;

				if (f < 0)
				{
					if (! opts.black) continue;
					c = 'rgba(0,0,0,' + (-f * opts.black) + ')';
				}
				else
				{
					if (! opts.white) continue;
					c = 'rgba(255,255,255,' + (f * opts.white) + ')';
				}
			
				ctx.fillStyle = c;
				ctx.fillRect(x, y, 1, 1);
			}
		}

		return true;
	}

	//
	this.parseStops = function(stops)
	{
		var temp = [];

		for (var f in stops)
		{
			var m = stops[f].match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
			if (! m)
				return false;

			var v = [];
			for (var j=0; j<3; j++) v.push( parseInt(m[j+1], 16) / 255. );
			v.push( f * 1. );
			temp.push(v);
		}

		temp.sort(function(a,b) { return a[3] - b[3]; });

		var flat = [];
		temp.forEach(function(e){ flat = flat.concat(e); });

		return flat;
	}

	this.initShaders = function()
	{
		this.v_shader = "                                              \
			attribute vec2 a_vertex_pos;			       \
									       \
			void main()					       \
			{						       \
				gl_Position = vec4(a_vertex_pos, 0.0, 1.0);    \
			}						       \
		";

		this.f_shader = "                                                                                 \
			precision highp float;									  \
														  \
			uniform vec2  u_canvas;									  \
			uniform vec4  u_stops[8];								  \
			uniform float u_cover;									  \
			uniform float u_black;									  \
			uniform float u_white;									  \
														  \
			vec4 cw = vec4(1.,1.,1.,1.);								  \
			vec4 cb = vec4(0.,0.,0.,1.);								  \
														  \
			float rand_1(vec2 xy) { return fract(sin(dot(xy, vec2(12.9898, 78.233))) * 43758.54); }	  \
			float rand_2(vec2 xy) { return fract(cos(dot(xy, vec2(78.233, 12.9898))) * 43758.54); }	  \
														  \
			vec4 grad(float f)									  \
			{											  \
				vec4  cl, cr, c;								  \
														  \
				cl = u_stops[0]; /* left */							  \
														  \
				if (cl.w < f)									  \
				{										  \
					for (int i=1; i<8; i++)							  \
					{									  \
						if (u_stops[i].w == 0.)						  \
							break;							  \
														  \
						cr = u_stops[i]; /* right */					  \
														  \
						if (f <= cr.w)							  \
							break;							  \
														  \
						cl = cr;							  \
					}									  \
				}										  \
														  \
				if (f <= cl.w) c = cl; else							  \
				if (f >= cr.w) c = cr; else							  \
					       c = (cr - cl) * (f - cl.w) / (cr.w - cl.w) + cl;			  \
														  \
				return vec4(c.x, c.y, c.z, 1);							  \
			}											  \
														  \
			void main()										  \
			{											  \
				vec2 xy = gl_FragCoord.xy/u_canvas;						  \
				vec4 c = grad(1. - xy.y);							  \
														  \
				if (u_cover < rand_1(xy))							  \
				{										  \
					gl_FragColor = c;							  \
					return;									  \
				}										  \
														  \
				float f = 1. - 2.*rand_2(xy);							  \
				vec4  m;									  \
														  \
				if (f < 0.)									  \
				{										  \
					f = -f*u_black;								  \
					m = cb;									  \
				}										  \
				else										  \
				{										  \
					f = f*u_white;								  \
					m = cw;									  \
				}										  \
														  \
				gl_FragColor = c * (1.-f) + m * f;						  \
			}											  \
		";
	}

	this.createUniforms = function(uniforms)
	{
		var gl = this.ctx_gl;
		var program = this.program;

		for (var k in uniforms)
		{
			var v = uniforms[k];
			var l = gl.getUniformLocation(program, k);
		
			if (typeof(v) == 'number')
			{
				gl.uniform1f(l, v);
			}
			else
			if (Array.isArray(v))
			{
				if (v.length == 2) gl.uniform2fv(l, v);
				else
				if (v.length % 4 == 0) gl.uniform4fv(l, v);
			}			
		}
	}
}

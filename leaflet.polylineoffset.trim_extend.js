L.PolylineOffset.offsetPoints = function(pts, options) {
	var offsetSegments = L.PolylineOffset.offsetPointLine(L.LineUtil.simplify(pts, options.smoothFactor), options.offset);
	let ring = L.PolylineOffset.joinLineSegments(offsetSegments, options.offset);
	
	if (0 < ring.length && options.start_trim !== undefined && options.end_extend !== undefined) {
		ring = L.PolylineOffset.trim_extend(ring, options);
	}
	if (0 < ring.length && options.start_add_x !== undefined && options.start_add_y !== undefined && options.end_add_x !== undefined && options.end_add_y !== undefined) {
		ring = L.PolylineOffset.add_point(ring, options);
	}
	return ring;
};


L.PolylineOffset.trim_extend = function(pts, options) {
	// 元のsegmentの長さを記録
	const c_segment_length_array = [];
	for (let i1 = 1; i1 < pts.length; i1++) {
		c_segment_length_array.push(((pts[i1].x - pts[i1 - 1].x) ** 2 + (pts[i1].y - pts[i1 - 1].y) ** 2) ** 0.5);
	}
	
	// 最初と最後の点を移動
	const c_x0 = pts[0].x + options.start_trim * (pts[1].x - pts[0].x) / c_segment_length_array[0];
	const c_y0 = pts[0].y + options.start_trim * (pts[1].y - pts[0].y) / c_segment_length_array[0];
	const c_x1 = pts[pts.length - 1].x + options.end_extend * (pts[pts.length - 1].x - pts[pts.length - 2].x) / c_segment_length_array[c_segment_length_array.length - 1];
	const c_y1 = pts[pts.length - 1].y + options.end_extend * (pts[pts.length - 1].y - pts[pts.length - 2].y) / c_segment_length_array[c_segment_length_array.length - 1];
	pts[0].x = c_x0;
	pts[0].y = c_y0;
	pts[pts.length - 1].x = c_x1;
	pts[pts.length - 1].y = c_y1;
	
	// 途中の余計な点を削除
	let l_total_length = 0;
	let l_start_trim_index = 0; // 残るうちの最初の点
	for (let i1 = 0; i1 < pts.length; i1++) {
		if (options.start_trim <= l_total_length) {
			l_start_trim_index = i1;
			break;
		}
		if (i1 === pts.length - 1) { // 最後より後
			l_start_trim_index = pts.length;
			break;
		}
		l_total_length += c_segment_length_array[i1];
	}
	l_total_length = 0;
	let l_end_trim_index = pts.length - 1; // 残るうちの最後の点
	for (let i1 = pts.length - 1; i1 >= 0; i1--) {
		if (l_total_length <= options.end_extend) {
			l_end_trim_index = i1;
			break;
		}
		if (i1 === 0) { // 最初より前
			l_end_trim_index = -1;
			break;
		}
		l_total_length -= c_segment_length_array[i1 - 1];
	}
	
	const c_out_pts = [];
	for (let i1 = 0; i1 < pts.length; i1++) {
		if (0 < i1 && i1 < Math.min(l_start_trim_index, pts.length - 1)) {
			continue;
		}
		if (Math.max(l_end_trim_index, 0) < i1 && i1 < pts.length - 1) {
			continue;
		}
		c_out_pts.push(pts[i1]);
	}
	
	return c_out_pts;
};

L.PolylineOffset.add_point = function(pts, options) {
	if (options.start_add_x !== 0 && options.start_add_y !== 0) {
		pts.unshift({"x": pts[0].x + options.start_add_x, "y": pts[0].y + options.start_add_y});
	}
	if (options.end_add_x !== 0 && options.end_add_y !== 0) {
		pts.push({"x": pts[pts.length - 1].x + options.end_add_x, "y": pts[pts.length - 1].y + options.end_add_y});
	}
	return pts;
};

// Leaflet.PolylineDecorator対応
if (L.PolylineDecorator !== undefined) {
	const isCoordArray = function (a1) {
		if (Array.isArray(a1) === false) {
			return false; // 配列でない
		}
		for (let i1 = 0; i1 < a1.length; i1++) {
			if (a1[i1] instanceof L.LatLng) {
				continue;
			}
			if (Array.isArray(a1[i1]) && a1[i1].length === 2 && typeof a1[i1][0] === "number" && typeof a1[i1][1] === "number") {
				continue;
			}
			return false; // 座標でない
		}
		return true;
	};
	
	L.PolylineDecorator.prototype._initPaths = function(input, isPolygon) {
		if (isCoordArray(input)) {
			if (isPolygon) {
				return [L.polyline(input.concat([input[0]]))];
			} else {
				return [L.polyline(input)];
			}
		}
		if (input instanceof L.Polyline) {
			return [input];
		}
		if (Array.isArray(input)) {
			const c_output = [];
			for (let i1 = 0; i1 < input.length; i1++) {
				c_output.push(this._initPaths(input[i1], isPolygon));
			}
			return c_output;
		}
		return [];
	};
	
	L.PolylineDecorator.prototype._initBounds = function() {
		const allPathCoords = this._paths.reduce((acc, path) => acc.concat(path.getLatLngs()), []);
		return L.latLngBounds(allPathCoords);
	};
	
	L.PolylineDecorator.prototype._getPatternLayers = function(pattern) {
		const mapBounds = this._map.getBounds().pad(0.1);
		return this._paths.map(path => {
			let l_LatLngs = path.getLatLngs();
			if (path.options.offset) {
				let l_ring = l_LatLngs.map(latLng => this._map.latLngToLayerPoint(latLng)); // 座標変換
				l_ring = L.PolylineOffset.offsetPoints(l_ring, path.options);
				
				// 仮のエラー対策
				let l_exist = false;
				const c_temp_ring = [];
				for (let i1 = 0; i1 < l_ring.length; i1++) {
					if (isNaN(l_ring[i1]["x"]) || isNaN(l_ring[i1]["y"])) {
						l_exist = true;
					} else {
						c_temp_ring.push(l_ring[i1]);
					}
				}
				if (l_exist === true) {
					console.log("NaN出現");
					console.log(l_ring);
				}
				l_ring = c_temp_ring;
				
				l_LatLngs = l_ring.map(point => this._map.layerPointToLatLng(point)); // 座標変換
			}
			const directionPoints = this._getDirectionPoints(l_LatLngs, pattern).filter(point => mapBounds.contains(point.latLng));
			return L.featureGroup(this._buildSymbols(l_LatLngs, pattern.symbolFactory, directionPoints));
		});
	};
}

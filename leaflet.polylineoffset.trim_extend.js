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
}


L.PolylineOffset.trim_extend = function(pts, options) {
	// 元のsegmentの長さを記録
	const c_segment_length_array = [];
	for (let i1 = 1; i1 < pts.length; i1++) {
		c_segment_length_array.push(((pts[i1].x - pts[i1 - 1].x) ** 2 + (pts[i1].y - pts[i1 - 1].y) ** 2) ** 0.5);
	}
	
	// 最初と最後の点を移動
    pts[0].x += options.start_trim * (pts[1].x - pts[0].x) / c_segment_length_array[0];
    pts[0].y += options.start_trim * (pts[1].y - pts[0].y) / c_segment_length_array[0];
    pts[pts.length - 1].x += options.end_extend * (pts[pts.length - 1].x - pts[pts.length - 2].x) / c_segment_length_array[c_segment_length_array.length - 1];
    pts[pts.length - 1].y += options.end_extend * (pts[pts.length - 1].y - pts[pts.length - 2].y) / c_segment_length_array[c_segment_length_array.length - 1];
    
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
},

L.PolylineOffset.add_point = function(pts, options) {
	if (options.start_add_x !== 0 && options.start_add_y !== 0) {
		pts.unshift({"x": pts[0].x + options.start_add_x, "y": pts[0].y + options.start_add_y});
	}
	if (options.end_add_x !== 0 && options.end_add_y !== 0) {
		pts.push({"x": pts[pts.length - 1].x + options.end_add_x, "y": pts[pts.length - 1].y + options.end_add_y});
	}
    return pts;
}

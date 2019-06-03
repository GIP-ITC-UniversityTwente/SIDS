	var lobes_sea = [
	  [
	    [[-180,   0], [-130,  90], [ -90,   0]],
	    [[ -90,   0], [  -30,  90], [ 60,   0]],
	    [[ 60,   0], [  120,  90], [ 180,   0]],
	  ],
	  [
	    [[-180,   0], [-120, -90], [-60,   0]],
	    [[ -60,   0], [  20, -90], [  100,   0]],
	    [[  100,   0], [ 140, -90], [ 180,   0]]
	  ]
	];

var svg = d3.select("#mapSVG"),
width = +svg.attr("width"),
height = +svg.attr("height");

var options = [
	  {name: "Interrupted Goode Homolosine (Ocean)", projection: d3.geoInterruptedHomolosine().lobes(lobes_sea).scale(150)},
		{name: "Eckert IV", projection: d3.geoEckert4().scale(175)},
		{name: "Mollweide", projection: d3.geoMollweide().scale(165)}
	];

/**
 * Event handler for the **projection menu** - does not get called when rotation slider changes.
 */
var menu = d3.select("#projection-menu")
.on("change", ()=>{
	// Call update function with the argument that is used for rotation
	// rotate takes [lat, lon] for rotation.
	var rotateBy = document.getElementById("myRange").value;
	var activeProjection = options[menu.property('selectedIndex')].projection;
	var rotation = [rotateBy, 0];
	update(rotation, activeProjection)
});

menu.selectAll("option")
.data(options)
.enter().append("option")
.text(function(d) { return d.name; });
	
var projection = d3.geoInterruptedHomolosine()
	.lobes(lobes_sea)
	.scale(150)
        
var graticule = d3.geoGraticule();

var path = d3.geoPath()
  .projection(projection);

var defs = svg.append("defs");

// Define the div for the tooltip
var tooltip = d3.select("#mapWrapper")
						.append("div")
						.attr("class", "hidden tooltip");

defs.append("path")
    .datum({type: "Sphere"})
    .attr("id", "sphere")
    .attr("d", path);

defs.append("clipPath")
    .attr("id", "clip")
  	.append("use")
    .attr("xlink:href", "#sphere");

svg.append("use")
    .attr("class", "stroke")
    .attr("xlink:href", "#sphere");

svg.append("use")
    .attr("class", "fill")
		.attr("xlink:href", "#sphere");

var land = svg.append("g").attr("class", "land");
var points = svg.append("g").attr("class", "points");

svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("clip-path", "url(#clip)")
		.attr("d", path);

///////////////////Load geojson data/////////////////////////
//Define color scale
// Threshold scale, maps values below first element of domain to first element of range,
// and values above domain[n] to range[n+1]
var color = d3.scaleThreshold()
  .domain([25, 50])
  //.clamp(true)
	.range(["rgb(254,224,210)", "rgb(252,146,114)","rgb(222,45,38)"]);

//Get country name
function nameFn(d){
  return d && d.properties ? d.properties.Admin : null;
}

//Get country name length
function nameLength(d){
  var n = nameFn(d);
  return n ? n.length : 0;
}

//Get poverty value
function Pov(d){
	return d && d.properties ? d.properties.PovPPT : 0;
}

//Get gray for null or poverty value
function fillFn(d){
		//console.log(d);
		if (d.properties.PovPPT==null) {
			return "rgb(209,211,212)";
		}
  return color(Pov(d));
	}

/////////////////////////////////////////////////////////////////
// https://bost.ocks.org/mike/join/
/////////////////////////////////////////////////////////////////
d3.json("poverty.geojson", function(error, mapData) {
	if (error) throw error;
	var features = mapData.features;

	features.forEach(f=>{
	  land.append("path")
		.datum(f)
		.attr("class", "land notgraticule")
		.style("fill", fillFn)
		.attr("clip-path", "url(#clip)")
		.attr("d", path)
		.on('mousemove', function(d) {
			tooltip.classed('hidden', false)
				.attr('style', 'left:' + (d3.event.clientX + 20) + 'px; top:' + (d3.event.clientY - 20) + 'px')
				.html("<strong>" + d.properties.ADMIN + "</strong>" +  " " + d.properties.PovPPT);
		}).on('mouseout', function(d) {
			tooltip.classed('hidden', true);
		});
	});
});


//SIDS
d3.json("sids.geojson", function(error, mapData) {
	if (error) throw error;
	var features = mapData.features;

	features.forEach(f=>{
	  points.append("path")
		.datum(f)
		.attr("class", "ISO notgraticule")
		.style('fill', fillFn)
		.attr("clip-path", "url(#clip)")
		.attr("d", path)
		.style('stroke', 'white')
		.on('mousemove', function(d) {
			tooltip.classed('hidden', false)
				.attr('style', 'left:' + (d3.event.clientX + 20) + 'px; top:' + (d3.event.clientY - 20) + 'px')
				.html("<strong>" + d.properties.Admin + "</strong>" + " " + d.properties.PovPPT);
		}).on('mouseout', function(d) {
			tooltip.classed('hidden', true);
		});
  });
});

/////////////////// END geojson data/////////////////////////

function randomColors(){
	svg.selectAll("path")
	.style("fill",function(f) {
		if(f.type=='Feature'){
			return "hsl(" + Math.random() * 360 + ",70%,30%)";
		}
	})
}
function randomGrey(){
	svg.selectAll("path")
	.style("fill",function(f) {
		if(f.type=='Feature'){
			return "hsl(" + Math.random() * 360 + " ,0%," + Math.round(Math.random() * 90) + "%)";
		}
	})
}
function fixedBlack(){
	svg.selectAll("path")
	.style("fill",function(f) {
		if(f.type=='Feature'){
			return "";
		}
	})
}

//Update callback for rotation slider
function update(rotation, proje) {
	  svg.selectAll("path").interrupt().transition()
	      .duration(1000).ease(d3.easeLinear)
	      .attrTween("d", projectionTween(rotation, proje))
	  //d3.timeout(loop, 1000)
}
function projectionTween(rotation, proje) {
	//console.log(`projectionTween(${rotation}, ${proje})`);

	return function(d) {
			// Take the current projection from the select box if the projection
			// parameter is not provided.
		  if (typeof(proje)=='undefined'){
				var projection = options[menu.property('selectedIndex')].projection
				.rotate(rotation)
				//.scale(152.63)
				//.translate([width / 2, height / 2])
				//.precision(0.1);
				
		  }else{
//			  if(options[menu.property('selectedIndex')].name=='Interrupted Goode Homolosine (Ocean)'){
//				document.getElementById("myRange").value="160"
//				document.getElementById("centerCoord").innerHTML="160"
//				rotation=[160,0]
//			  }
			var projection = proje
			.rotate(rotation)
			//.scale(152.63)
			//.translate([width / 2, height / 2])
			//.precision(0.1);
			  
		  }
			
			var graticule = d3.geoGraticule();

			var path = d3.geoPath()
			    .projection(projection);
	    return function(_) {
	      t = _;
	      return path(d);
	    };
	  };
	}

	function downloadSvg(){
    var r = confirm("After export the map resets to its original settings.");
    if (r == true) {
    	var config = {
    		    filename: 'mapExport',
    		  }
    	d3_save_svg.save(d3.select('svg').node(), config);
    	location.reload();
    } else {

		}

};

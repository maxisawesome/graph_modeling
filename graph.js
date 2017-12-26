/*
------------------------
------Intructions!------
------------------------
Click on a vertex to select it. Pressing 'e' activates 'Edge Mode,'
where clicking on another vertex will generate an edge to that vertex.
Pressing d will delete whatever vertex is currently selected, as
well as any edge connected to it.
Pressing c will clear the canvas and delete all vertices + edges.
Pressing i will change edge break size
pressing u will undo the last change, up to 20 changes can be undone.
pressing n will hide and unhide the vertex labels

Known bugs:
	undoing deleting an edgebreak will freak the program out...... sometimes
	If you resize the canvas, not all of the image saved will have a white background
	Sometimes when clicking on the canvas to deselect a vertex, for example, if you click
		beyond an edge (ie if the edge continued past the vertex, you would have clicked on
		it), it will select that edge.
	On occasion, double clicking on an intersection or an edge will ignore the intersection/
	  edge, and will create a vertex on top of the edge. What causes this is copmletely unknown,
		but most likely the edge or intersection is not properly stored in the corresponding array
		in CanvasState
		
	made an layered intersection, then broke one of the edges. Deleting the other edge broke the
		program.

*/


//A few global variables I needed

var scale = 1.0;
var scaleMultiplier = 0.8;
var scaleClicked = false;
var fileAsString = '';
var fileSelected = false;
var filename = '';


//----------------------
//--Object Definitions
//---------These functions define the objects
function Vertex(x, y, num, size, color){
	this.x = x;
	this.y = y;
	this.num = num;
	this.size = size;
	this.color = color;
	this.vertex = true;
}

function Edge(vertex1, vertex2, num){
	this.v1 = vertex1;
	this.v2 = vertex2;
	this.num = num;
	this.vertex = false;
}

function Intersection(x, y, edge1, edge2){
	this.x = x;
	this.y = y;
	this.edge1 = edge1;
	this.edge2 = edge2;
	this.layering = 0;
	this.disabled = false;
}

//----------------
//--Draw Functions
//------These functions draw the objects they are called on onto the canvas
Vertex.prototype.draw = function(ctx, num) {
	ctx.beginPath();
	ctx.arc(this.x, this.y, this.size, 0, 2*Math.PI);
	ctx.closePath();
	ctx.fillStyle = this.color; 
	ctx.fill();

	//num is null only when drawing the vertices over edges
	if(num != null){
		ctx.font = '10px Arial';
		ctx.fillText(num+1, this.x-3, this.y-11);
	}

}

Vertex.prototype.drawOutline = function(ctx, color) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(this.x, this.y, 10, 0, 2*Math.PI);
	ctx.stroke();

}


Edge.prototype.draw = function(ctx, color, width) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath(); 
	ctx.moveTo(this.v1.x, this.v1.y);
	ctx.lineTo(this.v2.x, this.v2.y);
	ctx.stroke(); 
}

//-----------------------
//--edge.nearestLinePoint
//-------called on an edge, returns the point on the edge nearest to passed coords
//-------(used on current mouse pos in mousemove I think). Used to detect clicking on
//-------edges to select them
Edge.prototype.nearestLinePoint = function(x, y) {
	lerp=function(a,b,x){ return(a+x*(b-a)); };
 	var dx=this.v1.x-this.v2.x,
 	    dy=this.v1.y-this.v2.y;
 	var t=((x-this.v2.x)*dx+(y-this.v2.y)*dy)/(dx*dx+dy*dy);
 	var lineX=lerp(this.v2.x, this.v1.x, t),
 	    lineY=lerp(this.v2.y, this.v1.y, t);
 	return({x:lineX,y:lineY});
}




//--------------------------------
//--Some Object specific functions
//------They are self-explanitory for the most part
Vertex.prototype.contains = function(mx, my) {
	return (10 >= Math.sqrt(Math.pow(Math.abs(this.x - mx),2) + Math.pow(Math.abs(this.y - my),2))); 
}



//This function is called on an Intersection and it draws a thick white line 
//under a thin blue line along one edge of the intersection at the intersection
//to create the layering.
Intersection.prototype.drawLayering = function (ctx) {

	//selects which edge to use
	if(this.layering == 1) {
		var edge = this.edge1;
	} else if (this.layering == 2) {
		var edge = this.edge2;
	} else { return; }

	//Change to an absolute length. 20 pixels
	//make unit vector
	var x_vec = (edge.v1.x-edge.v2.x)*0.1,
	    y_vec = (edge.v1.y-edge.v2.y)*0.1;
	var mag = Math.sqrt(x_vec*x_vec + y_vec*y_vec);

	ctx.strokeStyle = 'white';
	ctx.lineWidth = 10;
	ctx.beginPath(); 
	ctx.moveTo(this.x-x_vec, this.y-y_vec);
	ctx.lineTo(this.x+x_vec, this.y+y_vec);
	ctx.stroke(); 
  
	ctx.strokeStyle = 'blue';
	ctx.lineWidth = 4;
	ctx.beginPath(); 
	ctx.moveTo(this.x-x_vec, this.y-y_vec);
	ctx.lineTo(this.x+x_vec, this.y+y_vec);
	ctx.stroke(); 
 	
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}


//returns a boolean if point x, y is within range of mx my. 
function nearPoint(x, y, mx, my, range) {
	return (range>= Math.sqrt(Math.pow(Math.abs(x - mx),2) + Math.pow(Math.abs(y - my),2))); 
}

//------------------------
//--Intersection detection
//--------returns true/false if the two edges intersect,
//--------as well as the coords of their intersection
function lineIntersect(edge1, edge2) {
	var x1 = edge1.v1.x;
  var y1 = edge1.v1.y;
	var x2 = edge1.v2.x;
	var y2 = edge1.v2.y;
	
	var x3 = edge2.v2.x;
	var y3 = edge2.v2.y;
	var x4 = edge2.v1.x;
	var y4 = edge2.v1.y;

	var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)),
	    y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
  if (isNaN(x)||isNaN(y)) {
		return false;
	} else {
		if (x1>=x2) {
    	if (!(x2<=x&&x<=x1)) {return false;}
      } else {
      	if (!(x1<=x&&x<=x2)) {return false;}
      }
        if (y1>=y2) {
        	if (!(y2<=y&&y<=y1)) {return false;}
        } else {
            if (!(y1<=y&&y<=y2)) {return false;}
        }
        if (x3>=x4) {
            if (!(x4<=x&&x<=x3)) {return false;}
        } else {
            if (!(x3<=x&&x<=x4)) {return false;}
        }
        if (y3>=y4) {
            if (!(y4<=y&&y<=y3)) {return false;}
        } else {
            if (!(y3<=y&&y<=y4)) {return false;}
				}	
		} 
			if ( (x == x1 || x == x2 || x == x3 || x == x4) &&			
			     (y == y1 || y == y2 || y == y3 || y == y4) ) 
			{return false;}
		//change to an object	
    return [true, x, y];
}

//------------------------
//---Intersection Equality
//---------------returns true if the two intersections are the same.
function intersectionEquality(inter1, inter2) {
	return (inter1.edge1.num == inter2.edge1.num && inter1.edge2.num == inter2.edge2.num);

}


function breakCompare(a, b) {
	return a.x - b.x;
}


function CanvasState(canvas) {
	this.canvas = canvas;
	this.width = canvas.width;
	this.height = canvas.height;
	this.ctx = canvas.getContext('2d');

	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
	if (document.defaultView && document.defaultView.getComputedStyle) {
	this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
	this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
	this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
	this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
	}
	var html = document.body.parentNode;
	this.htmlTop = html.offsetTop;
	this.htmlLeft = html.offsetLeft;

	//HEY HEY HEY HEY HEY HEY HEY HEY HEY HEY HEY
	//THIS FUNCTION DEFINES OUR LOCAL VARIABLES 
	//HEY HEY HEY HEY HEY HEY HEY HEY HEY HEY HEY
	this.savedStates = [];
	this.reset();

	var myState = this;


	//------------------------------------------------------------------
	//------------------------------------------------------------------
	//------------------------------------------------------------------
		
	//-----------------
	//--Event Listeners
  //--------Following is a long list of event listeners and the
	//--------functions that fire when the events are detected.


	canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);

	//Mousedown fires when you depress the mouse button
	canvas.addEventListener('mousedown', function(e) {
		var mouse = myState.getMouse(e);
		var mx = (mouse.x - myState.translatePosX)/scale;
		var my = (mouse.y - myState.translatePosY)/scale;
		var vertices = myState.vertices;
		myState.startDragOffset.x = mouse.x - myState.translatePosX;
		myState.startDragOffset.y = mouse.y - myState.translatePosY;

		//This for loop runs through the vertices and checks if you 
		//clicked on one of them. If you did, it then checks if edgeMode
		//is on. If edgeMode is true and there's already a selected 
		//vertex, it makes an edge to that vertex.
		//If it's not true, then it selects the vertex you clicked on.
		var l = vertices.length;
		for(var i = l-1; i >= 0; i--) {
			if (vertices[i].contains(mx, my)) {
				var mySel = vertices[i];

				myState.dragoffx = mx - mySel.x;
				myState.dragoffy = my - mySel.y;
				if(myState.selection &&	myState.selection.num != mySel.num){
					var el = myState.edges.length;
					for(j = 0; j < el; j++) { //this forloop prevents duplicate edges
						var v1 = myState.edges[j].v1;
						var v2 = myState.edges[j].v2;
						if((v1.num == mySel.num || v1.num == myState.selection.num) &&
							 (v2.num == mySel.num || v2.num == myState.selection.num)){
							return;
						}
					}
					myState.updateStateString();
         	myState.addEdge(new Edge(myState.selection, mySel, myState.edgeCounter));
				} else{
					myState.selection = mySel;
					myState.dragging = true;
					myState.dragStart = true;
				}
				myState.valid = false;
				return; 
			}
		}
		
		var l = myState.edges.length;
		for (var i = 0; i < l; i++){
			var edgepoint = myState.edges[i].nearestLinePoint(mx, my);
			var dx = mx - edgepoint.x;
			var dy = my - edgepoint.y;
			var distance = Math.sqrt(dx*dx+dy*dy);
			if(distance < 3) { //we loop throgh the intersections to avoid
							  			//selecting an edge when layering intersections
				console.log(distance);
				var il = myState.intersections.length;
				for (var j = 0; j < il; j++) {
					if (nearPoint(myState.intersections[j].x,
											 	myState.intersections[j].y, mx, my, 10)) { 
						return;
					}
				}
				myState.selection = myState.edges[i];
				myState.valid = false;
				return;
			}	
		}
		myState.dragging = true;

		if (myState.selection) {
			myState.selection = null;
			myState.valid = false;
		}
	}, true );
	
	canvas.addEventListener('mousemove', function(e) {
		var mouse = myState.getMouse(e);
		var mx = (mouse.x - myState.translatePosX)/scale;
		var my = (mouse.y - myState.translatePosY)/scale;
		var v = null;
		if(myState.dragStart) {
			myState.updateStateString();
			myState.dragStart = false;
		}

		if(myState.dragging && myState.selection){
			myState.selection.x = (mx - myState.dragoffx);
			myState.selection.y = (my - myState.dragoffy);
			myState.valid = false; 		
		} else if (myState.dragging) {
			myState.translatePosX = mouse.x - myState.startDragOffset.x;
			myState.translatePosY = mouse.y - myState.startDragOffset.y;
			myState.valid = false;
		}/* else if (myState.selection) { //draws aqua edges
																												//on mouseovers
			var l = myState.vertices.length;
			for(var i = 0; i < l; i++){
				if(myState.vertices[i].contains(mx, my)){
					myState.temp_vertex = myState.vertices[i];
					myState.ctx.save();					
					myState.ctx.translate(this.translatePosX, this.translatePosY);
					myState.ctx.scale(scale,scale);
					var temp_edge = new Edge(myState.selection, v, myState.edgeCounter);
					temp_edge.draw(myState.ctx, 'Aqua', 3);
					myState.ctx.restore();
					myState.temp_edge_boo = true;
				}
			}
		}  
		if(myState.temp_edge_boo){ 
			if(!myState.temp_vertex.contains(mx, my)) { //redraws the canvas if we've drawn a temp edge we need 
		  	console.log('c');										 //to get rid of
				myState.valid = false;
				myState.temp_edge_boo = false;
			}
		} */
}, true);

	canvas.addEventListener('mouseup', function(e) {
		myState.dragging = false;
	}, true);


	canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
		var intersections = myState.intersections;
		var edges = myState.edges;
		var mx = (mouse.x - myState.translatePosX)/scale;
		var my = (mouse.y - myState.translatePosY)/scale;
		/*
		look at all the intersections
		if you've dblclick'd near one, check if its already elevated
		if it is, swap elevated edge
		if it has been swapped twice, remove elevation
		if all this shit hasn't happened, elevate one of the edges	
		*/

		var l = intersections.length;
		var el = myState.layeredIntersections.length;
		for (var i = 0; i < l; i++) { //loop through intersections
			if (nearPoint(intersections[i].x, intersections[i].y, mx, my, 10)) { //true if you've clicked on an intersection
				for (var j = 0; j < el; j++) { //loop through layeredInts
					if (intersectionEquality(intersections[i], 
			  			myState.layeredIntersections[j])){ //if what we clicked is in here, increment it
						myState.updateStateString();
						myState.layeredIntersections[j].layering = (myState.layeredIntersections[j].layering+1) % 3;
						myState.selection = null;
						myState.valid = false;
						return; //stop executing this funvtion
					}
				}
				myState.updateStateString();
				intersections[i].layering++;
				myState.layeredIntersections.push(intersections[i]);
				myState.selection = null;
				myState.valid = false;
				return;
			} 
		}

//Here we're looking to see if we clicked on an edge to see if we need to make a break
		var l = myState.edges.length;
		for (var i = 0; i < l; i++){
			var curEdge = myState.edges[i];
			var edgepoint = curEdge.nearestLinePoint(mx, my);
			var dx = mx - edgepoint.x;
			var dy = my - edgepoint.y;
			var distance = Math.abs(Math.sqrt(dx*dx+dy*dy));
			if(distance < 5) { //if true, we've clicked near enough to the nearest point
												 //on the edge that we take it as clicking on the edge
				var il = myState.intersections.length;
				for (var j = 0; j < il; j++) { //for loop to check that we didn't click on
																			 //an intersection
					if (nearPoint(myState.intersections[j].x, 
												myState.intersections[j].y, mx, my, 10)) { 
						return;
					}
				}
				myState.updateStateString();
				var brk = new Vertex(mx, my, myState.vertexCounter, 5, 'blue');
				myState.addVertex(brk);
				var v1 = curEdge.v1,
					  v2 = curEdge.v2	
				myState.edges.splice(i, 1);

				myState.addEdge(new Edge(v1, brk, myState.edgeCounter));
				myState.addEdge(new Edge(brk, v2, myState.edgeCounter));
				myState.selection = null;
				myState.valid = false;
				return;
			}	
		}
		myState.updateStateString();
		//We didn't click on an intersection or an edge, so make a new vertex
		myState.addVertex(new Vertex(mx, my, myState.vertexCounter, 10, 'black'));
	}, true);



	//---------
	//--KeyDown
	//---------Event listener that fires when you press a button.
	//---------This event handles ALL keypresses with the keycode 
	canvas.addEventListener('keydown', function(e) {
		//console.log(e.keyCode);
		var mySel = myState.selection;
		if (e.keyCode == 68 && myState.selection.vertex){ //d pressed on a vertex
			myState.deleteSelectedVertex();		
			myState.selection = null;
		} else if (e.keyCode == 68 && !myState.selection.vertex){ //d pressed on an edge
			myState.deleteSelectedEdge();
			myState.selection = null;
		} else if (e.keyCode == 67) { //c pressed
			myState.updateStateString();
			myState.reset();
		} else if (e.keyCode == 85) { //u pressed
			var str = myState.savedStates.pop();
			myState.savedStates.splice(myState.savedStates.length, 1);
			myState.loadFromString(str);
			console.log(myState.edges.length);
		}	else if (e.keyCode == 78) { //n pressed
			myState.vertexNumber = !myState.vertexNumber;
		} else if (e.keyCode == 73) { //i pressed
			myState.changeHingeSizes();
			
//This is all for debugging purposes. It'll print all stored objects to the onsole.
			console.log('intersections');
			var l = myState.intersections.length;
			console.log(l);
			for(var i = 0; i < l; i++){ 
				console.log(myState.intersections[i]); 
			}
			console.log('Layered Intersections:');
			var l = myState.layeredIntersections.length;
			for(var i = 0; i < l; i++){ 
				console.log(myState.layeredIntersections[i]); 
			}
			console.log('vertices:');
			var l = myState.vertices.length;
			for(var i = 0; i < l; i++){ 
				console.log(myState.vertices[i]); 
			}
			console.log('edges:');
			var l = myState.edges.length;
			for(var i = 0; i < l; i++){ 
				console.log(myState.edges[i]); 
			}
			
		}
			
		myState.valid = false;
	}, true);

	//calls the draw function every 30 milliseconds
	this.interval = 30;
	setInterval(function() { myState.draw(); }, myState.interval);
}


//------------------------------------------------------------------
//------------------------------------------------------------------
//------------------------------------------------------------------

	
//---
//--Add Object Functions
//------These functions take a vertex (the only thing that is passed
//------into these functions are new vertices) and add the defined
//------vertex into the local arrays in CanvasState. Then, sets valid
//------to false to redraw the canvas.
CanvasState.prototype.addVertex = function(vertex) {
	this.vertices.push(vertex);
	this.vertexCounter++;
	this.valid = false;
}

CanvasState.prototype.addEdge = function(edge) {
	this.edges.push(edge);
	this.edgeCounter++;
	this.valid = false;
}

CanvasState.prototype.addIntersection = function(inter) {
	this.intersections.push(inter);
	this.valid = false;
}

CanvasState.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
}

CanvasState.prototype.reset = function() {
	this.valid = false;
	this.vertices = [];
	this.edges = [];
	this.intersections = [];
	this.layeredIntersections = [];	

	this.vertexCounter = 0;
	this.edgeCounter = 0;

	this.dragStart = false;
	this.dragging = false;
	scale = 1.0;
	scaleMultiplier = 0.8;
	//selection is the vertex/edge we have currently selected
	this.selection = null;
	this.stateAsString = '';
	
	this.dragoffx = 0;
	this.dragoffy = 0;
	
	//var lastX = canvas.width/2, lastY = canvas.height/2;
	this.translatePosX = 0;
	this.translatePosY = 0;

	this.vertexNumber = false;
	this.temp_edge_boo = false;
	this.temp_vertex = null;	
	this.startDragOffset = {};

}

CanvasState.prototype.deleteSelectedVertex = function() {
	this.updateStateString();
	var mySel = this.selection;
	var edges = this.edges;
	var vertices = this.vertices;
	var l = vertices.length;
	for (var i = 0; i < l; i++){ //loop through vertices
		if(vertices[i].num == mySel.num) {//find the selected vertex
			var el = edges.length;

			if(mySel.size != 10) { //if an edge break, remake old edge 
				var v1, v2;
				for (var j = 0; j < el; j++){
					if(edges[j].v1.num == mySel.num){
						if(v1){ 
							v2 = edges[j].v2;
						} else {
							v1 = edges[j].v2;
						}
					}	else if (edges[j].v2.num == mySel.num) {
						if(v1){ 
							v2 = edges[j].v1;
						} else {
							v1 = edges[j].v1;
						}
					}
				}
				this.addEdge(new Edge(v1, v2, this.edgeCounter));
			}

			for (var j = 0; j < el; j++){  
				var v1, v2;
				if(edges[j].v1.num == mySel.num){
					if(v1){ v2 = edges[j].v2; } else { v1 = edges[j].v2; }
				}	else if (edges[j].v2.num == mySel.num) {
					if(v1){ v2 =edges[j].v1;	} else { v1 = edges[j].v1; }
				}
				if(v1 && v1.size != 10) { 
					this.deleteBreaks(v1);
					el = this.edges.length;
				} else if(edges[j].v1.num == mySel.num ||
								 edges[j].v2.num == mySel.num) {
					var edgeNum = edges[j].num;
					this.edges.splice(j, 1);
					edges = this.edges;
					el = edges.length; //we deleted that edge, so the length changes.
					j -= 1;	//redefine to the new length, but also decrement j b/c otherwise
				} 				//we'll skip checking one edge.
			}
		
			this.vertices.splice(i, 1);
			l = this.vertices.length;
			i -= 1;
		}
	}
	var il = this.layeredIntersections.length;
	for (var j = 0; j < il; j++){
		var intersection = this.layeredIntersections[j];
		if(intersection.edge1.num == edgeNum ||
			 intersection.edge2.num == edgeNum){
			this.layeredIntersections.splice(j, 1);
			j-=1;
			il = this.layeredIntersections.length;
		}
	}				
}


CanvasState.prototype.deleteSelectedEdge = function () {
	mySel = this.selection;
	var l = this.edges.length;
	for (var i = 0; i < l; i ++){
		if(this.edges[i].num == mySel.num) {
			this.updateStateString();
			this.edges.splice(i, 1);
			this.selection = null;
			this.valid = false;
			var il = this.layeredIntersections.length;
			for (var j = 0; j < il; j++){
				var intersection = this.layeredIntersections[j];
				if(intersection.edge1.num == mySel.num ||
			  	 intersection.edge2.num == mySel.num){
					this.layeredIntersections.splice(j, 1);
					j-=1;
					il = this.layeredIntersections.length;
				}
			}
		return;
		}
	}
}

CanvasState.prototype.deleteBreaks = function(vertex) {
	var l = this.edges.length;
	for(var i = 0; i < l; i++) {
		var nextVertex;
		if(this.edges[i].v1.num == vertex.num){
			nextVertex = this.edges[i].v2;
			this.edges.splice(i, 1);
			l = this.edges.length;
			i -= 1;
		}	else if (this.edges[i].v2.num == vertex.num) {
			nextVertex = this.edges[i].v1; 
			this.edges.splice(i, 1);
			l = this.edges.length;
			i -=1;
		}
	}
	var l = this.vertices.length;
	for(var i = 0; i < l; i++) {
		if(this.vertices[i].num == vertex.num){
			this.vertices.splice(i, 1);
			l = this.vertices.length;
			i -= 1;
		}
	}
	if(nextVertex.size != 10){
		this.deleteBreaks(nextVertex);
		return;
	}
}	

CanvasState.prototype.changeHingeSizes = function() {
	var l = this.vertices.length;
	for(var i = 0; i < l; i++){
		if(this.vertices[i].size == 1){
			this.vertices[i].size = 5;
		} else if (this.vertices[i].size == 5) {
			this.vertices[i].size = 1;
		}
	}
}


//This function takes nothing and redfines CanvasState's stateAsString.
//CanvasState.stateAsString is written to a text file when the save 
//button is pressed (not s, like the button that says "save as text file"). 
CanvasState.prototype.updateStateString = function() {
	var str = '';
	var vertices = this.vertices;
	var edges = this.edges;
	var layeredIntersections = this.layeredIntersections;
	var intersections = this.intersections;

	var l = vertices.length;
	for(var i = 0; i < l; i++) {
		str += 'V,';
		str += vertices[i].x + ',';
		str += vertices[i].y + ',';
		str += vertices[i].num + ',';
		str += vertices[i].size + ',';
		str += vertices[i].color + '\n';
	}
	var l = edges.length;
	for(var i = 0; i < l; i++) { 
		str += 'E,';
		str += edges[i].v1.num + ',';
		str += edges[i].v2.num + ',';
		str += edges[i].num;
		str += '\n';
	}
	var l = layeredIntersections.length;
	for(var i = 0; i < l; i++){
		str += 'LI,';
		str += layeredIntersections[i].x + ',';
		str += layeredIntersections[i].y + ',';
		str += layeredIntersections[i].edge1.num + ',';
		str += layeredIntersections[i].edge2.num + ',';
		str += layeredIntersections[i].layering + ',';
		str += layeredIntersections[i].disabled + '\n';
	}
	var l = layeredIntersections.length;
	for(var i = 0; i < l; i++){
		str += 'I,';
		str += intersections[i].x + ',';
		str += intersections[i].y + ',';
		str += intersections[i].edge1.num + ',';
		str += intersections[i].edge2.num + ',';
		str += intersections[i].layering + ',';
		str += intersections[i].disabled + '\n';
	}
	str += 'VC,' + this.vertexCounter;	
	str += '\nEC,' + this.edgeCounter;

	if(this.savedStates.length > 19){
		console.log('removing thing in pos 5');
		this.savedStates.splice(0, 1);
	}
	console.log(str);
	this.savedStates.push(str);	
	this.stateAsString = str;
}


CanvasState.prototype.loadFromString = function(str) {
	if( str == null ){ return; }
	console.log(str);
	this.reset();
	var stringAsArray = str.split('\n');
	var l = stringAsArray.length;
	for(var i = 0; i < l; i++) {
		var objStr = stringAsArray[i].split(',');
		//console.log(objStr);
		//objStr is the array of line i in the loaded file. Each line is labeled 
		//based on the first letter in the line. 

		if(objStr[0] == 'V'){
			this.addVertex(new Vertex(objStr[1], objStr[2], objStr[3], objStr[4], objStr[5]));
		}	else if(objStr[0] == 'E'){
			var v1 = this.vertices.filter(function( obj ) {
				return obj.num == objStr[1];
			});
			var v2 = this.vertices.filter(function( obj ) {
				return obj.num == objStr[2];
			});
			//v1 and v2 are returned as arrays, so to access them we need to put v1[0] to
			//get the first (and only) item in the array v1. That item is the vertex obj
			//we want to define edge with.
			console.log(v1[0], v2[0]);
			this.addEdge(new Edge(v1[0], v2[0], objStr[3]));
		} else if(objStr[0] == 'I') {			
			var e1 = this.edges.filter(function( obj ) { return obj.num == objStr[3]; });
			var e2 = this.edges.filter(function( obj ) { return obj.num == objStr[4]; });
			var inter = new Intersection(objStr[1], objStr[2], e1[0], e2[0]);
			inter.layering = parseInt(objStr[5]);
			inter.disabled = (objStr[6] == 'true');
			this.intersections.push(inter);
		} else if(objStr[0] == 'LI') {
			var e1 = this.edges.filter(function( obj ) { return obj.num == objStr[3]; });
			var e2 = this.edges.filter(function( obj ) { return obj.num == objStr[4]; });
			var inter = new Intersection(objStr[1], objStr[2], e1[0], e2[0]);
			inter.layering = parseInt(objStr[5]);
			inter.disabled = (objStr[6] == 'true');
			this.layeredIntersections.push(inter);
		} else if(objStr[0] == 'VC') {
			this.vertexCounter = objStr[1];
		} else if(objStr[0] == 'EC') {
			this.edgeCounter = objStr[1];
		}
	}
	this.valid = false;		
	fileSelected = false;	
}

CanvasState.prototype.draw = function() {
	if(!this.valid || scaleClicked) {
		var ctx = this.ctx;
		var vertices = this.vertices;
		var edges = this.edges;
		var intersections = [];	
	
		//start with a cleared canvas
		this.clear();

		var w = document.getElementById('width').value;
		var h = document.getElementById('height').value;
		document.getElementById('canvas').width = w;	
		document.getElementById('canvas').height = h;


		//save the coordinate system
		ctx.save();	

		//draw the background
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, 700, 700);	

		//translate and scale the coordinates.
		ctx.translate(this.translatePosX, this.translatePosY);
		ctx.scale(scale,scale);
	
		//We want the edges to be below the vertices, so draw them first.
		var l = edges.length;
    for (var i = 0; i < l; i++) {
     	edges[i].draw(ctx, 'blue', 4);
    }
		
		//Here we find all the intersections that occur and place them in the array. 
		//Note that everytime we call draw, this redefines the intersections with NO layering
		var l = edges.length;
		for (var i = 0; i < l; i++) {
			for (var j = i; j < l; j++) {
				var arr = lineIntersect(edges[i], edges[j]); 
				if(arr[0]) { 					
					intersections.push(new Intersection(arr[1], arr[2], edges[i], edges[j]));
				}
			}
		}
		this.intersections = intersections;
		
		//This for loop goes through the layeredIntersections, which are stored in a diff 
		//array than intersections bcus I need to store data about them accross several diff
		//draw methods. Intersections array gets remade every call of draw. For most intersections
		//its fine and doesnt matter, however for these we need to keep some data about them,
		//like layering, so we put them in the special layeredIntersections array.  

		var l = this.layeredIntersections.length;
		for (var i = 0; i < l; i++) {
			var arr = lineIntersect(this.layeredIntersections[i].edge1, this.layeredIntersections[i].edge2);
			if(arr[0]) { //this if clause updates the intersetion to the new point. 
				this.layeredIntersections[i].disabled = false;
				this.layeredIntersections[i].x = arr[1];
				this.layeredIntersections[i].y = arr[2];
			} else { //the disabled boolean was implemented to stop the 'compass' bug we had earlier.
				this.layeredIntersections[i].disabled = true;
			}
		}		
	
		//Now that we've stored and updated the layeredIntersections,
		//we can actually draw them by calling the drawLayering function on them.
		var l = this.layeredIntersections.length;
		for (var i = 0; i < l; i++) {
			if (!this.layeredIntersections[i].disabled){
				this.layeredIntersections[i].drawLayering(ctx);
			}
		}

		//--Draws the Vertices
		//--------Calls draw on every vertex in in the vertices array,
		//--------given that they're on the screen. Do this last so that
		//--------the vertices are on top of everything
		var breakCounter = 0; //used to make sure the real vertices are labeled correctly
		var l = vertices.length;
		if (this.vertexNumber){ //this boolean is toggled when n is pressed
			for (var i = 0; i < l; i++) {
				if(vertices[i].size == 10){
					vertices[i].draw(ctx, i-breakCounter); 			
				} else {
					vertices[i].draw(ctx, null); 			
					breakCounter++;
				}
			}
		} else {
			for (var i = 0; i < l; i++) {
				vertices[i].draw(ctx, null); 			
			}	
		}
	
		//--Draws the selection outline.
		//--------If a vertex is selected, draws the red outline on it.
		//--------If an edge is selected, draws it in red.
		if(this.selection != null && this.selection.vertex){
			this.selection.drawOutline(ctx, 'red');
		}	else if (this.selection != null && this.selection.v1){
			this.selection.draw(ctx, 'red', 5);
			this.selection.v1.draw(ctx, null);
			this.selection.v2.draw(ctx, null);
		}
		//call restore to restore the default coordinates. This is necessary to keep
		//scaling and translating again and have it work properly. Look for graphical
		//explainations if unclear.
		ctx.restore();
		
		//this.updateStateString();
		this.valid = true;
	} else if (fileSelected) {
		this.updateStateString();
		this.loadFromString(fileAsString);
	}
}

//Returns the current mouse position
CanvasState.prototype.getMouse = function(e) {
	var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;

	if (element.offsetParent !== undefined) {
		do {
			offsetX += element.offsetLeft;
			offsetY += element.offsetTop;
		} while ((element = element.offsetParent));
	}
	offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
	offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;
	mx = e.pageX - offsetX;
	my = e.pageY - offsetY;
	return {x: mx, y: my};
}

function handleFileSelect(evt) { 
	var cont = confirm('Are you sure you want to load a file?\nThis will erase what is currently drawn.');
	if (!cont) { return; }
	var file = evt.target.files;
	//if(!file[0].type.match('*.graph')) { alert('Wrong file type. Please use a .graph file'); }
	var reader = new FileReader();
	reader.onload = function(e) {
		fileAsString = e.target.result;
		fileSelected = true;
	}
	reader.readAsText(file[0]);
}

//what is this for......
//function to_image() {
	//var canvas = document.getElementById("canvas");
	//var img = canvas.toDataURL("image/png");
//}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}
 
window.onload = function() {
 
    //this is the canvas state we summon. It holds most things in the file.
    var s = new CanvasState(document.getElementById('canvas'));
     
 
    //needed to add a few listeners outside of CanvasState, and this is where
    //most global variables are used. 
    document.getElementById("plus").addEventListener("click", function(){
        scale /= scaleMultiplier;
        scaleClicked = true;
    }, false);
 
    document.getElementById("minus").addEventListener("click", function(){
        scale *= scaleMultiplier;
        scaleClicked = true;
    }, false);
 
    document.getElementById('files').addEventListener('change', handleFileSelect, false);
 
    document.getElementById("save_button").onclick =  function(){
				s.updateStateString();
        filename = prompt("Please name your file. .graph will be added to the end of what you enter.", "graph1");
        if(filename != null){
            download(filename+'.graph', s.stateAsString);
        }
    }
}


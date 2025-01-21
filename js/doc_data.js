/* Potholder project
 * Ceramic production database application
 * See https://github.com/alfille/potholder
 * or https://alfille.online
 * by Paul H Alfille 2024
 * MIT license
 * */

/* jshint esversion: 11 */

export {
    PotData,
    PotDataReadonly,
    PotDataPrint,
    PotNewData,
    SettingsData,
    DatabaseData,
} ;

import {
    PotImages,
} from "./app.js" ;
    
// data entry page type
class PotDataRaw { // singleton class
    constructor(click,doc,struct,readonly=false) {
        //console.log("Click",click,"DOC",doc, "Structure", struct);
        // args is a list of "docs" to update"
        this.Images = new PotImages(doc);

        this.doc = doc;
        
        // Add dummy entries for extra images
        this.match_image_list() ;

        // Create (recursively) objects to mirror the structure
        this.list = new EntryList( struct, this.Images, readonly ) ;
        
        // Load the objects with doc data 
        this.list.load_from_doc( doc ) ;

        // jump to edit mode?
        if ( click ) {
            this.edit_doc() ;
        } else {
            this.list.show_doc() ;
        }
    }

    edit_doc() {
        this.list.edit_doc();
        document.querySelectorAll(".savedata").forEach( s => s.disabled = true ) ;
    }
    
    loadDocData() {
        this.list.form2value() ; // make sure data is loaded
        if ( this.list.changed() ) {
            const doc = this.list.get_doc() ;
            Object.assign( this.doc, doc ) ;
            return true ;
        }
        return false ;
    }

    saveChanged ( state ) {
        const deleted_images = this.list.get_deletes() ;

        const data_change = this.loadDocData() ; // also sets this.doc
        if ( data_change ) {
            // doc is changed
            globalDatabase.db.put( this.doc )
            .then( r => new Detachment( r.id, r.rev ) )
            .then( D => D.remove( deleted_images) )
            .then( _ => globalThumbs.getOne( this.doc._id ) )
            .catch( (err) => globalLog.err(err) )
            .finally( () => globalPage.show( state ) );
        } else {
            globalPage.show( state ) ;
        }
    }
    
    savePieceData() {
        //console.log( "Deleted pictures", this.list.get_deletes().join(", ") )
        this.saveChanged( "PotMenu" );
    }
    
    back() {
        if ( this.list.changed() ) {
            if ( confirm("WARNING: Unsaved changes.\nPress OK to discard your new data.\nPress CANCEL to NOT DISCARD yet.") ) {
                globalPage.show("back");
            } else {
                document.querySelectorAll(".savedata").forEach(s=>s.disabled = false);
            }
        } else {
            globalPage.show("back");
        }
    }    

    match_image_list() {
        // makes changes to this.doc, but doesn't store until later save (if needed)
        
        // attachments
        const a_list = [] ;
        // Add dummy entries for extra images
        if ( "_attachments" in this.doc ) {
            Object.keys(this.doc._attachments).forEach( a => a_list.push(a) );
        }
        
        // image entries
        const i_list = [] ;
        if ( "images" in this.doc ) {
            this.doc.images.forEach( i => i_list.push(i.image) ) ;
        }
        
        // image entry for each attachment
        a_list
            .filter( a => ! i_list.includes(a) )
            .forEach( a=> this.doc.images
                .push( {
                    image: a,
                    comment: "<Restored>",
                    date: new Date().toISOString()
                    })
                );

        // remove references to non-existent images
        i_list
            .filter( i => ! a_list.includes(i) )
            .forEach( i => delete this.doc.images[i] ) ;
    }
}

class PotData extends PotDataRaw {
    constructor(doc,struct) {
        super(false,doc,struct); // clicked = false
    }
}

class PotDataEditMode extends PotDataRaw {
    // starts with "EDIT" clicked
    constructor(doc,struct) {
        super(true,doc,struct); // clicked = true
    }
}

class PotDataReadonly extends PotDataRaw {
    constructor(doc,struct) {
        super(false,doc,struct,true); // clicked = false, readonly=true
    }
}    

class PotNewData extends PotDataEditMode {
    constructor( ...args) {
        super(...args);
    }
    
    savePieceData() {
        this.loadDocData();
        globalDatabase.db.put( this.doc )
        .then( (response) => {
            globalPot.select(response.id)
            .then( () => globalPage.show( "PotMenu" ) );
            })
        .then( () => globalThumbs.getOne( this.doc._id ) )
        .catch( (err) => globalLog.err(err) )
        ;
    }
}

class DatabaseData extends PotDataRaw {
    // starts with "EDIT" clicked
    constructor(doc,struct) {
        if ( globalDatabase.database=="" ) {
            // First time
            super(true,doc,struct); // clicked = true
        } else {
            super(false,doc,struct); // clicked = false
        }
    }

    savePieceData() {
        if ( this.loadDocData() ) {
            if ( this.doc.raw=="fixed" ) {
                this.doc.address=globalDatabase.SecureURLparse(this.doc.address); // fix up URL
            }
            ["username","password","database","address","local"].forEach( x => globalDatabase[x] = this.doc[x] ) ;
            globalDatabase.store() ;
        }
        globalPage.reset();
        location.reload(); // force reload
    }
}

class SettingsData extends PotData {
    savePieceData() {
        this.loadDocData() ;
        Object.assign ( globalSettings, this.doc ) ;
        globalStorage.set( "settings", globalSettings ) ;
		if (globalSettings.fullscreen=="always") {
			document.documentElement.requestFullscreen()
			.finally( _ => globalPage.show("back") ) ;
		} else {
			if ( document.fullscreenElement ) {
				document.exitFullscreen() ;
			}
			globalPage.show("back") ;
		}
    }
}

class Detachment {
    constructor( pid, rev ) {
        this.pid = pid ;
        this.rev = rev ;
    }

    remove( i_list ) {
        if ( i_list && i_list.length>0 ) {
            const name = i_list.pop() ;
            return globalDatabase.db.removeAttachment( this.pid, name, this.rev )
                .then( r => {
                    this.rev = r.rev ;
                    return this.remove( i_list ) ;
                    })
                .catch( err => globalLog(err,"Database") );
        } else {
            return Promise.resolve(true) ;
        }
    }
}

class PotDataPrint { // singleton class
    constructor(doc,struct) {
        // args is a list of "docs" to update"
        this.Images = new PotImages(doc);
        
        this.doc = doc;

        // Create (recursively) objects to mirror the structure
        this.list = new EntryList( struct, this.Images ) ;
        
        // Load the objects with doc data 
        this.list.load_from_doc( this.doc ) ;

        this.list.print_doc() ;
        globalPage.show_print();
        setTimeout( this.print, 1000 ) ;
    }

    print() {
            window.print() ;
    } 
    
}

class EntryList {
    constructor( struct_list, Images=null, readonly=false ) {
        this.readonly = readonly ;
        this.double_tap = false ;
        this.members = struct_list.map( struct => {
            switch (struct.type) {
                case "text":
                    return new TextEntry( struct ) ;
                case "image":
                    return new ImageEntry( struct, Images ) ;
                case "textarea":
                    return new TextAreaEntry( struct ) ;
                case "radio":
                    return new RadioEntry( struct ) ;
                case "checkbox":
                    return new CheckboxEntry( struct ) ;
                case "date":
                    return new DateEntry( struct ) ;
                case "bool":
                    return new BoolEntry( struct ) ;
                case "list":
                    return new ListEntry( struct ) ;
                case "array":
                    return new ArrayEntry( struct, this, Images ) ;
                case "image_array":
                    return new ImageArrayEntry( struct, this, Images ) ;
                case "number":
                    return new NumberEntry( struct ) ;
                case "crop":
                    return new CropEntry( struct );
                default:
                    return new InvisibleEntry( struct );
            }
            }) ;
    }
        
    get_deletes() {
        // unique list
        const s = new Set( this.members.map( e => e.get_deletes() ).flat() );
        return [...s] ;
    }

    load_from_doc( doc ) {
        // put doc data in objects
        this.members.forEach( e => e.load_from_doc( doc ) ) ;
    }
        
    form2value() {
        // get data from HTMO fields into "new_val"
        this.members.forEach( e => e.form2value() ) ;
    }
    
    save_enable() {
        this.form2value() ;
        if ( this.changed() ) {
            document.querySelectorAll(".savedata").forEach(s => s.disabled = false );
        }
    }
    
    changed() {
        //console.log("CHANGE Entry_list");
        return this.members.some( m => m.changed() ) ;
    }
    
    get_doc() {
        const doc = {} ;
        this.members.forEach( m => {
                const e = m.get_doc() ;
                doc[e[0]] = e[1] ;
                });
        return doc ;
    }
        
    show_doc() {
        const parent = document.getElementById("PotDataContent");
        parent.innerHTML = "";
        
        parent.appendChild(this.show_doc_inner()) ;
        cloneClass( this.readonly ? ".ExtraNoEdit" : ".ExtraEdit",  parent ) ;
    }

    show_doc_inner() {
        const ul = document.createElement('ul');

        this.members
            .filter( m => m.struct.type != "image" )
            .forEach( item => {
                const li = document.createElement("li");
                item.show_item().forEach( e => li.appendChild(e)) ;
                ul.appendChild( li );
                });

        ul.onclick = () => {
            // fake double-tap (phones don't have ondblclick)
            if ( this.double_tap ) {
                // second tap
                this.double_tap = false ;
                this.edit_doc() ;
                document.querySelectorAll(".savedata").forEach( s => s.disabled = true ) ;
            } else {
                // first tap
                this.double_tap = true ;
                setTimeout( ()=>globalPotData.double_tap = false, 500 ) ;
            }
        } ;
        return ul ;
    }

    choicePromise() {
        // actually, return a promise of the choices
        
        // create the pairs for all "choices" items
        this.members.forEach( m => m.picks = ("choices" in m.struct ) ? m.struct.choices : [] ) ;
            
        // perform the queries for the items with queries and return a aggretate promise
        // can work even if no queries    
        return Promise.all( this.members
            .filter( all_item => "query"   in all_item.struct )
            .map( query_item => globalDatabase.db.query( query_item.struct.query, {group:true,reduce:true} )
            .then( q_result => q_result.rows
                .filter( r=>r.key )
                .filter( r=>r.value>0)
                .forEach(r=>query_item.picks.push(r.key)))
            ));
        }

    print_doc() {
        const parent = document.getElementById("print_space");
        parent.innerHTML = "";
        
        parent.appendChild(this.print_doc_inner()) ;
    }

    print_doc_inner() {
        const ul = document.createElement('ul');
        
        this.members
        .forEach( item => {
            const li = document.createElement("li");
            item.print_item().forEach( e => li.appendChild(e)) ;
            ul.appendChild( li );
            });

        return ul ;
    }

    edit_doc() {
        if ( this.readonly ) {
            return ;
        }
        
        document.querySelectorAll(".topButtons").forEach( v=>v.style.display="none" ); 
        document.querySelector(".potDataEdit").style.display="block";
        const parent = document.getElementById("PotDataContent");
        parent.innerHTML = "";
        
        this.edit_doc_inner()
        .then( ul => parent.appendChild(ul) )
        .then( _ => cloneClass( ".ExtraSave", parent )) ;
    }    

    edit_doc_inner() {
        const ul = document.createElement('ul');
        return this.choicePromise( this.struct ).then( _ => {
            this.members.forEach( item => {
                const li = document.createElement("li");
                li.classList.add("MainEditList");
                item.edit_item()
                    .forEach( e => li.appendChild(e)) ;
                ul.appendChild( li );
                });
            return ul ;
        });
    }    
}

class InvisibleEntry {
    // base class for basic (non-visible) entries
    static unique = 0 ;
    // class (s) for data entry items
    constructor( struct ) {
        this.struct = struct ;
        this._name = struct.name ;
        this._alias = struct?.alias ?? this._name ;
        this.localname = `LOCAL_${InvisibleEntry.unique}`;
        InvisibleEntry.unique += 1 ;
        this.deleted_images = [] ;
    }
    
    save_enable() {
        this.form2value() ;
        if ( this.changed() ) {
            document.querySelectorAll(".savedata").forEach(s => s.disabled = false );
        }
    }
    
    changed() {
        // value changed from initial setting
        return this.initial_val != this.new_val ;
    }
    
    default_value() {
        return "" ;
    }
    
    form2value() {
    }
    
    load_from_doc( doc ) {
        this.initial_val = (this._name in doc) ? doc[this._name] : this.default_value() ;
        this.new_val = this.initial_val ;
    }
    
    get_doc() {
        // pair for creating doc of values
        return [this._name, this.new_val] ;
    }
    
    print_item() {
        return this.show_item() ;
    }

    show_item() {
        return [] ;
    }
    
    edit_item() {
        return [] ;
    }

    get_deletes() {
        return this.deleted_images ;
    }
}

class VisibleEntry extends InvisibleEntry {
        default_value() {
            return "" ;
        }
        
        form2value() {
            const local = [...document.getElementsByName(this.localname)] ;
            if ( local.length > 0 ) {
                this.new_val = local[0].value ;
            }
        }
        
        show_label() {
        const span = document.createElement('span');
        span.classList.add('fill_show_label');
        span.innerHTML=`<i>${this._alias}:&nbsp;&nbsp;</i>`;
        span.title=this.struct.hint??"data entry";
        return span ;
        }
                        
    show_item() {
        // Wrap with label and specific display
        const span = document.createElement('span');
        span.classList.add('fill_show_data');
        span.title = this.struct.hint ?? "Enter data";
    
        span.appendChild( this.show_item_element() ) ;
        return [this.show_label(),span];
    }
    
    show_item_element() {
        // default element = straight text
        return document.createTextNode( (this.new_val == "") ? "<empty>" : this.new_val ) ;
    }

    edit_label() {
        // label for edit item
        const lab = document.createElement("label");
    
        // possibly use an alias instead of database field name
        lab.appendChild( document.createTextNode(`${this._alias}: `) );
        lab.title = this.struct.hint;
            
        return lab ;
    }
    
    edit_item() {
        // wraps the label and calls for HTML elements
        return [this.edit_label()].concat( this.edit_flatten().flat() ) ;
    }

    edit_flatten() {
        // returns a list of HTML elements (will be flattened and a label added)
        return [document.createTextNode("Unimplemented")] ;
    }
}

class TextEntry extends VisibleEntry {
    edit_flatten() {
        // get value and make type-specific input field with filled in value
        const inp = document.createElement( "input" );
        inp.title = this.struct.hint;
        inp.name = this.localname ;
        inp.value = this.new_val ;
        inp.oninput = () => this.save_enable() ;
        return [ inp ] ;
    }
}
                
class TextAreaEntry extends VisibleEntry {
    edit_flatten() {
        // get value and make type-specific input field with filled in value
        const inp = document.createElement( "textarea" );
        inp.title = this.struct.hint;
        inp.name = this.localname ;
        inp.value = this.new_val ;
        inp.oninput = () => this.save_enable() ;
        return [ inp ] ;
    }
}
                
class ImageEntry extends VisibleEntry {
    constructor( struct, Images ) {
        super( struct ) ;
        this.Images = Images ;
    }
    
    show_item_element() {
        // image or comment
        return this.Images.displayClickable(this.new_val,"medium_pic") ;
    }
    
    print_item() {
        return [this.Images.print_display( this.new_val )] ;
    }
            
    edit_item() {
        return [this.Images.displayClickable(this.new_val,"medium_pic") ] ;
    }
}
                
class ListEntry extends VisibleEntry {
    edit_flatten() {
        const dlist = document.createElement("datalist");
        dlist.id = this.localname ;
        this.picks.forEach( pick => 
            dlist.appendChild( new Option(pick) )
            ); 

        const inp = document.createElement("input");
        inp.setAttribute( "list", dlist.id );
        inp.name = this.localname ;
        inp.value = this.new_val;
        inp.oninput = () => this.save_enable() ;

        return [dlist,inp] ;
    }
}

class RadioEntry extends VisibleEntry {
    form2value() {
        this.new_val = [...document.getElementsByName(this.localname)]
            .filter( i => i.checked )
            .map(i=>i.value)[0] ?? "" ;
    }

    edit_flatten() {
        return this.picks.map( pick => {
            const inp = document.createElement("input");
            inp.type = "radio";
            inp.name = this.localname;
            inp.value = pick;
            inp.oninput = () => this.save_enable() ;
            if ( pick == this.new_val ) {
                inp.checked = true;
            }
            inp.title = this.struct.hint;
            return [inp,document.createTextNode(pick)];
        }) ;
    }
}

class DateEntry extends VisibleEntry {
    default_value() {
        return new Date().toISOString() ;
    }
    
    show_item_element() {
        // default element = straight text
        return document.createTextNode( (this.new_val == "") ? "<empty>" : this.new_val.split("T")[0] ) ;
    }

    edit_flatten() {
        const inp = document.createElement("input");
        inp.type = "date";
        inp.name = this.localname ;
        inp.title = this.struct.hint;
        inp.value = this.new_val.split("T")[0] ;
        inp.oninput = () => this.save_enable() ;
        return [inp] ;
    }
}

class CropEntry extends InvisibleEntry {
    default_value() {
        return [] ;
    }
}

class BoolEntry extends VisibleEntry {
        default_value() {
                return "false" ;
        }
        
        show_item_element() {
                return document.createTextNode( (this.new_val=="true") ? "yes" : "no" ) ;
        } 

        form2value() {
            this.new_val = [...document.getElementsByName(this.localname)]
                .filter( i => i.checked )
                .map(i=>i.value)[0] ?? "" ;
        }
        
        edit_flatten() {
                return [true,false].map( pick => {
                        const inp = document.createElement("input");
                        inp.type = "radio";
                        inp.name = this.localname;
                        inp.value = pick;
                        inp.oninput = () => this.save_enable() ;
                        switch (pick) {
                                case true:
                                        inp.checked = (this.new_val == "true") ;
                                        break ;
                                default:
                                        inp.checked = (this.new_val !== "true") ;
                                        break ;
                        }
                        inp.title = this.struct.hint;
                        return [ inp,document.createTextNode(pick?"yes":"no")];
                        }) ;
        }
}

class CheckboxEntry extends VisibleEntry {
    default_value() {
            return [] ;
    }

    load_from_doc( doc ) {
        this.initial_val = (this._name in doc) ? doc[this._name] : this.default_value() ;
        if ( ! Array.isArray( this.initial_val ) ) {
            this.initial_val = [ this.initial_val ] ;
        }
        this.new_val = this.initial_val ;
    }
    
    show_item_element() {
            // list as text
            return document.createTextNode( (this.new_val.length == 0) ?  "<empty>" : this.new_val.join(", ") ) ;
    }
    
    form2value() {
        this.new_val = [...document.getElementsByName(this.localname)]
                .filter( i => i.checked )
                .map( i => i.value );
    }

    changed() {
        //console.log("Change check", type._name);
        return (this.initial_val.length != this.new_val.length) || this.initial_val.some( (v,i) => v != this.new_val[i] ) ;
    }
     
    edit_flatten() {
        return this.picks.map( pick => {
            const inp = document.createElement("input");
            inp.type = "checkbox";
            inp.name = this.localname;
            inp.value = pick;
            inp.oninput = () => this.save_enable() ;
            if ( this.new_val.includes(pick) ) {
                inp.checked = true;
            }
            inp.title = this.struct.hint;
            return [inp,document.createTextNode(pick)];
            }); 
    }
}               
                                
class NumberEntry extends VisibleEntry {
        default_value() {
                return null ;
        }

        show_item_element() {
                return document.createTextNode( this.new_val.toString() ?? "<empty>" ) ;
        }
}               

class ArrayEntry extends VisibleEntry {
    constructor( struct, enclosing, Images=null ) {
        super( struct ) ;
        this.initial_val=[] ;
        this.enclosing = enclosing ;
        this.Images = Images ;
    }
        
    save_enable() {
        this.form2value() ;
        if ( this.changed() ) {
            document.querySelectorAll(".savedata").forEach(s => s.disabled = false );
        }
    }

    get_deletes() {
        return this.new_val.map( e => e.get_deletes() ).concat(this.deleted_images).flat();
    }
    
    changed() {
        return (this.new_val.length != this.initial_val.length) 
            || this.new_val.some( m => m.changed() ) 
            || this.new_val.some( (n,i) => n != this.initial_val[i] )
            ;
    }

    get_doc() {
            return [ this._name, this.new_val.map( e => e.get_doc() ) ] ;
    }

    load_from_doc( doc ) {
        if ( (this._name in doc) && Array.isArray(doc[this._name]) ) {
            // make an entry for each data array element in doc, of the full members EntryList 
            this.initial_val = doc[this._name]
                .map( (e,i) => {
                    const elist = new EntryList( this.struct.members, this.Images ) ;
                    elist.load_from_doc( doc[this._name][i] ) ;
                    return elist ;
                    } ) ;
        } else {
            this.initial_val = []; 
        }
        this.new_val = [ ...this.initial_val ] ;
    }       

    form2value() {
        // get data from HTML fields into "new_val"
        this.new_val.forEach( e => e.form2value() ) ;
    }
    
    show_item() {
        // show as table with list for each member (which is a set of fields in itself)
        const clone = document.createElement("span"); // dummy span to hold clone
        cloneClass( ".Darray", clone ) ;

        const tab = clone.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>${this._alias} list</i>`;
        tab.querySelectorAll("button").forEach(b=>b.style.display="none");

        if ( this.new_val.length > 0 ) {
            this.new_val.forEach( entry => {
                const td = tab.insertRow(-1).insertCell(0);
                td.appendChild( entry.show_doc_inner() ) ;
                });
        } else {
            tab.insertRow(-1).insertCell(-1).innerHTML="<i>- no entries -</i>";
        }
        return [tab];
    }

    print_item() {
            // show as table with list for each member (which is a set of fields in itself)
    const clone = document.createElement("span"); // dummy span to hold clone
    cloneClass( ".Darray", clone ) ;

    const tab = clone.querySelector( ".Darray_table" ) ;
    tab.querySelector("span").innerHTML=`<i>${this._alias} list</i>`;
    tab.querySelectorAll("button").forEach(b=>b.style.display="none");

    if ( this.new_val.length > 0 ) {
        this.new_val.forEach( entry => {
            const td = tab.insertRow(-1).insertCell(0);
            td.appendChild( entry.print_doc_inner() ) ;
            });
    } else {
        tab.insertRow(-1).insertCell(-1).innerHTML="<i>- no entries -</i>";
    }
    return [tab];
    }

    edit_item() {
    // Insert a table, and pull label into caption

    // Heading and buttons
    const clone = document.createElement("span"); // dummy span to hold clone
    cloneClass( ".Darray", clone ) ;

    // table caption
    const tab = clone.querySelector( ".Darray_table" ) ;
    tab.querySelector("span").innerHTML=`<i>${this._alias} list</i>`;
    tab.querySelector(".Darray_add").hidden=false;
    tab.querySelector(".Darray_add").onclick=()=>this.edit_array_entry( -1 );
        switch ( this.new_val.length ) {
            case 0:
                break ;
            case 1:
                tab.querySelector(".Darray_edit").hidden=false;
                tab.querySelector(".Darray_edit").onclick=()=>this.edit_array_entry( 0 );
                break ;
            default:
                tab.querySelector(".Darray_edit").hidden=false;
                tab.querySelector(".Darray_edit").onclick=()=>this.select_edit();
                tab.querySelector(".Darray_rearrange").hidden=false;
                tab.querySelector(".Darray_rearrange").onclick=()=>this.rearrange();
                break ;
        }

        // table entries
        if ( this.new_val.length > 0 ) {
            this.new_val.forEach( (entry,i) => {
                const tr = tab.insertRow(-1);
                tr.onclick = () => this.edit_array_entry( i );
                
                const td = tr.insertCell(-1);
                td.appendChild(entry.show_doc_inner());
                });
        } else {
            tab.insertRow(-1).insertCell(-1).innerHTML="<i>- no entries -</i>";
        }
        return [tab];
    }

    fake_page() {
        document.querySelectorAll(".topButtons").forEach( v=>v.style.display="none" ); 
        document.querySelector(".potDataEdit").style.display="none";
        const parent = document.getElementById("PotDataContent");
        parent.innerHTML = "";
        return parent ;
    }               
    
    select_edit() {
        // Insert a table, and pull label into caption
        const parent = this.fake_page() ;
            
        // Heading and buttons
        cloneClass( ".Darray", parent ) ;
        const tab = parent.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>Choose ${this._alias} item</i>`;
        [".Darray_back"].forEach(c=>tab.querySelector(c).hidden=false);
        tab.querySelector(".Darray_back").onclick=()=>this.enclosing.edit_doc();

        // table
        this.new_val.forEach( (entry,i) => {
            const tr = tab.insertRow(-1);
            tr.onclick = () => this.edit_array_entry( i );
            
            const td = tr.insertCell(-1);
            td.appendChild(entry.show_doc_inner());
            });
    }

    edit_array_entry( idx ) {
                const parent = this.fake_page() ;
        const adding = idx==-1 ; // flag for adding rather than editing
        const local_list = adding ? new EntryList( this.struct.members, this.Images ) : this.new_val[idx] ;
        if ( adding ) {
            // fill in default values
            local_list.load_from_doc( {} ) ;
        }

        // controls to be added to top
        const control_li = document.createElement('li');
        cloneClass( ".Darray_li", control_li ) ;
        control_li.querySelector("span").innerHTML=`<i>${adding?"Add":"Edit"} ${this._alias} entry</i>`;
        control_li.classList.add("Darray_li1");
        (adding?[".Darray_ok",".Darray_cancel"]:[".Darray_ok",".Darray_cancel",".Darray_delete"]).forEach(c=>control_li.querySelector(c).hidden=false);
        control_li.querySelector(".Darray_ok").onclick=()=>{
            local_list.form2value() ;
            if ( adding ) {
                this.new_val.push( local_list ) ;
            }
            this.save_enable();
            this.enclosing.edit_doc() ;
        };
        control_li.querySelector(".Darray_cancel").onclick=()=>this.enclosing.edit_doc();
        control_li.querySelector(".Darray_delete").onclick=()=>{
            if (confirm(`WARNING -- about to delete this ${this._alias} entry\nPress CANCEL to back out`)==true) {
                this.new_val.splice(idx,1);
                this.save_enable();
                this.enclosing.edit_doc();
            }
        };

        // Insert edit fields and put controls at top
        local_list.edit_doc_inner()
        .then( ul => {
            ul.insertBefore( control_li, ul.children[0] );
            parent.appendChild(ul) ;
            }) ;
    }

    swap( i1, i2 ) {
        [this.new_val[i1],this.new_val[i2]] = [this.new_val[i2],this.new_val[i1]] ; 
        this.rearrange() ; // show the rearrange menu again
    }

    rearrange() {
        const parent = this.fake_page() ;

        // Insert a table, and pull label into caption
                
        // Heading and buttons
        cloneClass( ".Darray", parent ) ;
        const tab = parent.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>${this._alias} rearrange order</i>`;
        [".Darray_ok"].forEach(c=>tab.querySelector(c).hidden=false);

        tab.querySelector(".Darray_ok").onclick=()=>{
            this.save_enable() ;
            this.enclosing.edit_doc();
            };

        // table
        this.new_val.forEach( (entry) => {
            const tr = tab.insertRow(-1) ;
            tr.insertCell(-1).innerHTML=`<button type="button" class="Darray_up" title="Move this entry up"><B>&#8657;</B></button>`;
            tr.insertCell(-1).innerHTML=`<button type="button"  class="Darray_down" title="Move this entry down"><B>&#8659;</B></button>`;
            const td = tr.insertCell(-1);
            td.style.width="100%";
                        td.appendChild(entry.show_doc_inner());
            });
            
        const elements = this.new_val.length ;
        tab.querySelectorAll(".Darray_up"  ).forEach( (b,i)=>b.onclick=()=> this.swap( i, (i+elements-1)%elements ) ) ;
        tab.querySelectorAll(".Darray_down").forEach( (b,i)=>b.onclick=()=> this.swap( i, (i+1)%elements )  );
        }
        
}

class ImageArrayEntry extends ArrayEntry {
    find_entry(entry,type) {
        return entry.members.find( m => m.struct.type == type ) ;
    }
    
    show_image( entry ) {
        const image = this.find_entry( entry, "image" ) ;
        if ( image ) {
            return image.show_item_element() ;
        } else {
            return document.createTextNode("No image") ;
        }
    }
    
    member_image( entry ) {
        const crop = this.find_entry( entry, "crop" ) ;
        return this.Images.displayClickable(
            this.find_entry( entry, "image" ).new_val ,
            this.new_val.length > 3 ? "small_pic" : "medium_pic" ,
            crop ? crop.new_val : null 
            );
    }
        
                
    show_item() {
        // show as table with list for each member (which is a set of fields in itself)
        const clone = document.createElement("span"); // dummy span to hold clone
        cloneClass( ".Darray", clone ) ;

        const tab = clone.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>Saved Images</i>`;
        tab.querySelectorAll("button").forEach(b=>b.style.display="none");

        if ( this.new_val.length > 0 ) {
            this.new_val.forEach( entry => {
                const tr = tab.insertRow(-1);
                tr.insertCell(-1).appendChild( this.member_image( entry ) );                    
                const td=tr.insertCell(-1);
                td.style.width="100%";
                td.appendChild(entry.show_doc_inner() );
                });
        } else {
            tab.insertRow(-1).insertCell(-1).innerHTML="<i>- no entries -</i>";
        }
        return [tab];
    }
        
    edit_item() {
        // Insert a table, and pull label into caption

        // Heading and buttons
        const clone = document.createElement("span"); // dummy span to hold clone
        cloneClass( ".Darray", clone ) ;

        // table caption
        const tab = clone.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>${this._alias} list</i>`;
        switch ( this.new_val.length ) {
            case 0:
                break ;
            case 1:
                tab.querySelector(".Darray_edit").hidden=false;
                tab.querySelector(".Darray_edit").onclick=()=>this.edit_array_entry( 0 );
                break ;
            default:
                tab.querySelector(".Darray_edit").hidden=false;
                tab.querySelector(".Darray_edit").onclick=()=>this.select_edit();
                tab.querySelector(".Darray_rearrange").hidden=false;
                tab.querySelector(".Darray_rearrange").onclick=()=>this.rearrange();
                break ;
        }

        // table entries
        if ( this.new_val.length > 0 ) {
            this.new_val.forEach( (entry,i) => {
                const tr = tab.insertRow(-1);
                tr.insertCell(-1).appendChild( this.member_image( entry ) );
                const td=tr.insertCell(-1);
                td.style.width="100%";
                td.onclick = () => this.edit_array_entry( i );
                td.appendChild(entry.show_doc_inner() );
                });
        } else {
            tab.insertRow(-1).insertCell(-1).innerHTML="<i>- no entries -</i>";
        }
        return [tab];
    }

    select_edit() {
        // Insert a table, and pull label into caption
        const parent = this.fake_page() ;
            
        // Heading and buttons
        cloneClass( ".Darray", parent ) ;
        const tab = parent.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>Choose ${this._alias} item</i>`;
        [".Darray_back"].forEach(c=>tab.querySelector(c).hidden=false);
        tab.querySelector(".Darray_back").onclick=()=>this.enclosing.edit_doc();

        // table
        this.new_val.forEach( (entry,i) => {
            const tr = tab.insertRow(-1);
            tr.onclick = () => this.edit_array_entry( i );
            tr.insertCell(-1).appendChild( this.member_image( entry ) );
            
            const td = tr.insertCell(-1);
            td.appendChild(entry.show_doc_inner());
            });
    }

    rearrange() {
        const parent = this.fake_page() ;

        // Insert a table, and pull label into caption
                
        // Heading and buttons
        cloneClass( ".Darray", parent ) ;
        const tab = parent.querySelector( ".Darray_table" ) ;
        tab.querySelector("span").innerHTML=`<i>${this._alias} rearrange order</i>`;
        [".Darray_ok"].forEach(c=>tab.querySelector(c).hidden=false);

        tab.querySelector(".Darray_ok").onclick=()=>{
            this.save_enable();
            this.enclosing.edit_doc();
            };

        // table
        this.new_val.forEach( (entry) => {
            const tr = tab.insertRow(-1) ;
            tr.insertCell(-1).innerHTML=`<button type="button" class="Darray_up" title="Move this entry up"><B>&#8657;</B></button>`;
            tr.insertCell(-1).innerHTML=`<button type="button"  class="Darray_down" title="Move this entry down"><B>&#8659;</B></button>`;
                tr.insertCell(-1).appendChild( this.member_image( entry ) );
                const td=tr.insertCell(-1);
                td.style.width="100%";
                td.appendChild(entry.show_doc_inner() );
            });
            
        const elements = this.new_val.length ;
        tab.querySelectorAll(".Darray_up"  ).forEach( (b,i)=>b.onclick=()=> this.swap( i, (i+elements-1)%elements ) ) ;
        tab.querySelectorAll(".Darray_down").forEach( (b,i)=>b.onclick=()=> this.swap( i, (i+1)%elements )  );
    }
        
    edit_array_entry( idx ) {
        // image version, no add, crop enabled
        const parent = this.fake_page() ;
        const local_list = this.new_val[idx] ;

        // controls to be added to top
        const control_li = document.createElement('li');
        cloneClass( ".Darray_li", control_li ) ;
        control_li.querySelector("span").innerHTML=`<i>Edit Image</i>`;
        control_li.classList.add("Darray_li1");
        [".Darray_ok",".Darray_cancel",".Darray_delete"].forEach(c=>control_li.querySelector(c).hidden=false);
        control_li.querySelector(".Darray_ok").onclick=()=>{
            local_list.save_enable() ;
            this.enclosing.edit_doc() ;
        };
        control_li.querySelector(".Darray_cancel").onclick=()=>{
            this.save_enable();
            this.enclosing.edit_doc();
            };
        control_li.querySelector(".Darray_delete").onclick=()=>{
            if (confirm(`WARNING -- about to delete this ${this._alias} entry\nPress CANCEL to back out`)==true) {
                this.deleted_images.push( this.find_entry( this.new_val[idx], "image" ).new_val ) ; // add image name to list
                this.new_val.splice(idx,1); // remove image entrylist
                this.save_enable(); // flag as change
                this.enclosing.edit_doc(); // go back to (updated) image list
            }
            };

        // Insert edit fields and put controls at top
        local_list.edit_doc_inner()
        .then( ul => {
            ul.insertBefore( control_li, ul.children[0] );
            parent.appendChild(ul) ;
            }) ;
    }
}

/* Potholder project
 * Ceramic production database application
 * See https://github.com/alfille/potholder
 * or https://alfille.online
 * by Paul H Alfille 2024
 * MIT license
 * */

/* jshint esversion: 11 */

export {
    PotImages,
} ;

import {
    PotData,
    PotDataReadonly,
    SettingsData,
    DatabaseData,
    PotDataPrint,
} from "./doc_data.js" ;

class Pagelist {
    // list of subclasses = displayed "pages"
    static pages = {} ;
    
    constructor() {
        Pagelist.pages[this.constructor.name] = this ;
    }

    show_page(name) {
        // reset buttons from edit mode
        document.querySelector(".potDataEdit").style.display="none"; 
        document.querySelectorAll(".topButtons")
            .forEach( tb => tb.style.display = "block" );

        // hide all but current page
        document.querySelectorAll(".pageOverlay")
            .forEach( po => po.style.display = po.classList.contains(name) ? "block" : "none" );

        // hide Thumbnails
        document.getElementById("MainPhotos").style.display="none";
        
        this.show_content();
    }
    
    show_content() {
        // default version, derived classes may overrule
        // Simple menu page
    }
}

class PagelistThumblist extends Pagelist {
    show_content() {
        document.getElementById("MainPhotos").style.display="block";
    }
}

new class RemoteDatabaseInput extends Pagelist {
    show_content() {
        new TextBox("Your Credentials") ;
        const doc = {} ;
        ["username","password","database","address","local"].forEach( x => doc[x] = globalDatabase[x] ) ;
        doc.raw = "fixed";
        globalPotData = new DatabaseData( doc, structRemoteUser );
    }
}() ;

new class Settings extends Pagelist {
    show_content() {
        new TextBox("Display Settings") ;
        const doc = Object.assign( {}, globalSettings ) ;
        globalPotData = new SettingsData( doc, structSettings );
    }
}() ;

new class PotPrint extends Pagelist {
    show_content() {
        if ( globalPot.isSelected() ) {
            globalDatabase.db.get( potId )
            .then( (doc) => globalPotData = new PotDataPrint( doc, structData.Data.concat(structData.Images) ) )
            .catch( (err) => {
                globalLog.err(err);
                globalPage.show( "back" );
                });
        } else {
            globalPage.show( "back" );
        }
    }
}() ;

new class Help extends Pagelist {
    show_content() {
        window.open( new URL(`https://alfille.github.io/potholder`,location.href).toString(), '_blank' );
        globalPage.show("back");
    }
}() ;

new class AllPieces extends Pagelist {
    show_content() {
        globalPot.unselect() ;
        new StatBox() ;
        document.getElementById("MainPhotos").style.display="block";
        globalTable = new PotTable();
        globalPot.getAllIdDoc()
        .then( (docs) => globalTable.fill(docs.rows ) )
        .catch( (err) => globalLog.err(err) );
    }
}() ;

class ListGroup extends Pagelist {
    constructor( fieldname ) {
        super() ;
        this.field_name = fieldname ;
    }
    
    // "field_name" from struct in derived classes
    show_content() {
        globalPot.unselect() ;
        const item = structData.Data.find( i => i.name == this.field_name ) ;
        if ( item ) {
            new ListBox(`grouped by ${item?.alias ?? item.name}`) ;
            document.getElementById("MainPhotos").style.display="block";
            switch (item.type) {
                case "radio":
                case "list":
                case "text":
                    globalTable = new MultiTable( (doc)=> {
                        if ( (item.name in doc) && (doc[item.name]!=="") ) {
                            return [doc[item.name] ] ;
                        } else {
                            return ["unknown"] ;
                        }
                        });
                    break ;
                case "checkbox":
                    globalTable = new MultiTable( (doc)=> {
                        if ( (item.name in doc) && (doc[item.name].length > 0) ) {
                            return doc[item.name] ;
                        } else {
                            return ["unknown"] ;
                        }
                        });
                    break ;
                case "array":
                    globalTable = new MultiTable( (doc)=> {
                        if ( (item.name in doc) && (doc[item.name].length>0) ) {
                            return doc[item.name].map( t => t.type ) ;
                        } else {
                            return ["unknown"] ;
                        }
                        });
                    break ;
            }
        } else {
            globalPage.show("ListMenu");
        }
    }
}

new class ListSeries extends ListGroup       {}("series") ;
new class ListForm extends ListGroup         {}("type") ;
new class ListConstruction extends ListGroup {}("construction") ;
new class ListStage extends ListGroup        {}("stage") ;
new class ListKiln extends ListGroup         {}("kiln") ;
new class ListGlaze extends ListGroup        {}("glaze") ;
new class ListClay extends ListGroup         {}("clay")

new class ErrorLog extends Pagelist {
    show_content() {
        globalPot.unselect() ;
        new TextBox("Error Log");
        globalLog.show() ;
        document.getElementById("MainPhotos").style.display="block";
    }
}() ;
new class FirstTime extends Pagelist {
    show_content() {
        globalPot.unselect() ;
        new TextBox("Welcome") ;
        if ( globalDatabase.db !== null ) {
            globalPage.show("MainMenu");
        }
    }
}() ;

new class MainMenu extends Pagelist {
    show_content() {
        globalPot.unselect();
        new StatBox() ;
        document.getElementById("MainPhotos").style.display="block";
    }
}() ;

new class ListMenu extends Pagelist {
    show_content() {
        globalPot.unselect();
        new StatBox() ;
        document.getElementById("MainPhotos").style.display="block";
    }
}() ;

new class PotEdit extends Pagelist {
    show_content() {
        if ( globalPot.isSelected() ) {
            globalDatabase.db.get( potId )
            .then( (doc) => globalPotData = new PotDataReadonly( doc, structData.Data ))
             .catch( (err) => {
                globalLog.err(err);
                globalPage.show( "back" );
                });

        } else {
            globalPage.show( "back" );
        }
    }
}() ;

new class PotMenu extends Pagelist {
    show_content() {
        if ( globalPot.isSelected() ) {
            globalDatabase.db.get( potId )
            .then( (doc) => {
                globalPot.select(potId) ; // update thumb
                globalPot.showPictures(doc) ; // pictures on bottom
            })
            .catch( (err) => {
                globalLog.err(err);
                globalPage.show( "back" );
                })
                ;
        } else {
            globalPage.show( "back" );
        }
    }
}() ;

new class SearchList extends Pagelist {
    show_content() {
        globalPot.unselect() ;
        new StatBox() ;
        document.getElementById("MainPhotos").style.display="block";
        globalTable = new SearchTable() ;
        globalSearch.setTable();
    }
}() ;

class Page { // singleton class
    constructor() {
        this.normal_screen = false ; // splash/screen/print for show_screen
        this.path = [];
    }
    
    reset() {
        // resets to just MainMenu
        this.path = [ "MainMenu" ] ;
    }

    back() {
        // return to previous page (if any exist)
        this.path.shift() ;
        if ( this.path.length == 0 ) {
            this.reset();
        }
    }

    current() {
        if ( this.path.length == 0 ) {
            this.reset();
        }
        return this.path[0];
    }

    add( page = null ) {
        if ( page == "back" ) {
            this.back();
        } else if ( page == null ) {
            return ;
        } else {
            const iop = this.path.indexOf( page ) ;
            if ( iop < 0 ) {
                // add to from of page list
                this.path.unshift( page ) ;
            } else {
                // trim page list back to prior occurence of this page (no loops, finite size)
                this.path = this.path.slice( iop ) ;
            }
        }
    }

    isThis( page ) {
        return this.current()==page ;
    }

    forget() {
        // remove this page from the "back" list -- but don't actually go there
        this.back();
    }

    helpLink(help=null) {
        const helpLoc = "https://alfille.github.io/" ;
        const helpDir = "/potholder/" ;
        const helpTopic = help ?? this.current() ;
        window.open( new URL(`${helpDir}${helpTopic}.html`,helpLoc).toString(), '_blank' );
    } 
    
    show( page ) { // main routine for displaying different "pages" by hiding different elements
        if ( globalSettings?.console == "true" ) {
            console.log("SHOW",page,"STATE",this.path);
        }
        // test that database is selected
        if ( globalDatabase.db == null || globalDatabase.database == null ) {
            // can't bypass this! test if database exists
            if ( page != "FirstTime" && page != "RemoteDatabaseInput" ) {
                this.show("RemoteDatabaseInput");
            }
        }

        this.add(page) ; // place in reversal list

        // clear display objects
        globalPotData = null;
        globalTable = null;
        document.querySelector(".ContentTitleHidden").style.display = "none";

        this.normal_display(); // basic page display setup

        // send to page-specific code
        const target_name = this.current() ;
        if ( target_name in Pagelist.pages ) {
            Pagelist.pages[target_name].show_page(target_name) ;
        } else {
            this.back() ;
        }
    }
    
    normal_display() { // switch between screen and print
        if ( this.normal_screen ) {
            return ;
        }
        this.normal_screen = true ;
        // Clear Splash once really.
        document.getElementById("splash_screen").style.display = "none";
        
        document.querySelectorAll(".work_screen").forEach( v => v.style.display="block" ) ;
        document.querySelectorAll(".picture_screen").forEach( v => v.style.display="block" ) ;
        document.querySelectorAll(".print_screen").forEach( v => v.style.display="none" ) ;
    }    

    print_display() { // switch between screen and print
        if ( !this.normal_screen ) {
            return ;
        }
        this.normal_screen = false ;
        // Clear Splash once really.
        document.getElementById("splash_screen").style.display = "none";
        
        document.querySelectorAll(".work_screen").forEach( v => v.style.display="none" ) ;
        document.querySelectorAll(".picture_screen").forEach( v => v.style.display="none" ) ;
        document.querySelectorAll(".print_screen").forEach( v => v.style.display="block" ) ;
    }    

    headerLink() {
        if ( globalPage.current() != "MainMenu" ) {
            globalPage.show("MainMenu") ;
        } else {
            if ( globalPage ) {
                globalPage.reset();
            }
            window.location.href="/index.html"; // force reload
        }
    }
}

globalPage = new Page();

// Application starting point
window.onload = () => {
    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.replaceState({}, '') );

    // Settings
    globalSettings = Object.assign( {
        console:"true",
        img_format:"webp",
        fullscreen: "big_picture",
        }, globalStorage.get("settings") ) ;
    
    // set Credentials from Storage / URL
    globalDatabase.acquire_and_listen() ; // look for database

    if ( new URL(location.href).searchParams.size > 0 ) {
        // reload without search params -- placed in Cookies
        window.location.href = "/index.html" ;
    }

    // Start pouchdb database
    globalDatabase.open() ;       
    if ( globalDatabase.db ) {
        // Thumbnails
        globalThumbs.setup() ; // just getting canvas from doc
        globalThumbs.getAll() ;
        
        // now start listening for any changes to the database
        globalDatabase.db.changes({ 
            since: 'now', 
            live: true, 
            include_docs: false 
            })
        .on('change', (change) => {
            if ( change?.deleted ) {
                globalThumbs.remove( change.id ) ;
            } else {
                globalThumbs.getOne( change.id ) ;
            }
            // update screen display
            if ( globalPage.isThis("AllPieces") ) {
                globalPage.show("AllPieces");
            }
            })
        .catch( err => globalLog.err(err,"Initial search database") );

        // Show screen
        ((globalSettings.fullscreen=="always") ?
            document.documentElement.requestFullscreen()
            : Promise.resolve())
        .finally( _ => globalPage.show("MainMenu") ) ;
        
    } else {
        globalPage.reset();
        globalPage.show("FirstTime");
    }
};

class TitleBox {
    show(html) {
        //console.log("TITLEBOX",html);
        document.getElementById( "titlebox" ).innerHTML = html ;
    }
}

class BlankBox extends TitleBox {
    constructor() {
        super();
        this.show("") ;
    }
}

class PotBox extends TitleBox {
    constructor( doc ) {
        super();
        this.show(`<button type="button" onClick='globalPage.show("PotMenu")'>${[doc?.type,"from",doc?.series,"by",doc?.artist,doc?.start_date].join(" ")}</button>` ) ;
    }
}

class TextBox extends TitleBox {
    constructor( text ) {
        super();
        this.show( `<B>${text}</B>` ) ;
    }
}

class ListBox extends TitleBox {
    constructor( text ) {
        super();
        this.show( `<B><button type="button" class="allGroup" onclick="globalTable.close_all()">&#10134;</button>&nbsp;&nbsp;<button type="button" class="allGroup" onclick="globalTable.open_all()">&#10133;</button>&nbsp;&nbsp;${text}</B>` ) ;
    }
}

class StatBox extends TitleBox {
    constructor() {
        super();
        globalDatabase.db.query("qPictures", { reduce:true, group: false })
        .then( stat => this.show( `Pieces: ${stat.rows[0].value.count}, Pictures: ${stat.rows[0].value.sum}` ) )
        .catch( this.show( "No data yet" ) );
    }
}

class Pot { // convenience class
    constructor() {
        this.TL=document.getElementById("TopLeftImage");
        this.LOGO = document.getElementById("LogoPicture");
        this.pictureSource = document.getElementById("HiddenPix");
    }
    
    getAllIdDoc() {
        const doc = {
            startkey: Id_pot.allStart(),
            endkey:   Id_pot.allEnd(),
            include_docs: true,
            attachments: false,
        };
        return globalDatabase.db.allDocs(doc);
    }
        
    select( pid = potId ) {
        potId = pid ;
        // Check pot existence
        // Top left Logo
        globalThumbs.displayThumb( this.TL, pid ) ;
        new TextBox("Piece Selected");
    }

    isSelected() {
        return ( potId != null ) ;
    }

    unselect() {
        potId = null;
        this.TL.src = this.LOGO.src;
        if ( globalPage.isThis("AllPieces") ) {
            const pt = document.getElementById("PotTable");
            if ( pt ) {
                pt.rows.forEach( r => r.classList.remove('choice'));
            }
        }
        new BlankBox();
    }

    showPictures(doc) {
        // doc alreaady loaded
        const pix = document.getElementById("PotPhotos");
        const images = new PotImages(doc);
        pix.innerHTML="";
        images.displayAll().forEach( i => pix.appendChild(i) ) ;
    }
}

class Id_pot {
    static type = "p";
    static version = 0;
    static start="";
    static end="\uffff";
    
    static splitId( id=potId ) {
        if ( id ) {
            const spl = id.split(";");
            return {
                version: spl[0] ?? null, // 0 so far
                type:    spl[1] ?? null,
                artist:  spl[2] ?? null,
                date:    spl[3] ?? null,
                rand:    spl[4] ?? null, // really creation date
            };
        }
        return null;
    }
    
    static joinId( obj ) {
        return [
            obj.version,
            obj.type,
            obj.artist,
            obj.date,
            obj.rand
            ].join(";");
    }
    
   static allStart() { // Search entire database
        return [this.version, this.type, this.start].join(";");
    }
    
    static allEnd() { // Search entire database
        return [this.version, this.type, this.end].join(";");
    }
}

globalPot = new Pot() ;

class PotImages {    
    constructor( doc ) {
        // uses images array in doc
        //  image: name
        //  crop: dimensions
        this.images = doc?.images ?? [] ;
        this.pid = doc._id ;
        // doc does not need to have attachments included.
    }

    getURL( name ) {
        return globalDatabase.db.getAttachment( this.pid, name )
        .then( data => URL.createObjectURL(data) ) ;
    }
    
    displayClickable( name, pic_size="small_pic", new_crop=null ) {
        //console.log("displayClickable",name,pic_size,new_crop);
        const img = new Image() ;
        const canvas = document.createElement("canvas");
        switch ( pic_size ) {
            case "small_pic":
                canvas.width = 60 ;
                break;
            default:
                canvas.width = 120 ;
                break ;
        }
        canvas.classList.add("click_pic") ;
        let crop = [] ;
        this.getURL( name )
        .then( url => {
            img.onload = () => {
                URL.revokeObjectURL(url) ;
                crop = new_crop ;
                if ( !crop || crop.length!=4 ) {
                    crop = this.images.find( i => i.image==name)?.crop ?? null ;
                }
                if ( !crop || crop.length!=4 ) {
                    crop = [0,0,img.naturalWidth,img.naturalHeight] ;
                }
                const h = canvas.width * crop[3] / crop[2] ;
                canvas.height = h ;
                canvas.getContext("2d").drawImage( img, crop[0], crop[1], crop[2], crop[3], 0, 0, canvas.width, h ) ;
                } ;
            canvas.onclick=()=>{
                const img2 = new Image() ; // temp image
                document.getElementById("modal_canvas").width = window.innerWidth ;
                this.getURL( name )
                .then( url2 => {
                    img2.onload = () => {
                        URL.revokeObjectURL(url2) ;
                        const canvas2 = document.getElementById("modal_canvas");
                        const [cw,ch] = rightSize( crop[2], crop[3], window.innerWidth, window.innerHeight-75 ) ;
                        canvas2.height = ch ;
                        canvas2.getContext("2d").drawImage( img2, crop[0], crop[1], crop[2], crop[3], 0, 0, cw, ch ) ;
                        screen.orientation.onchange=()=>{
                            screen.orientation.onchange=()=>{};
                            document.getElementById('modal_id').style.display='none';
                            requestAnimationFrame( ()=>canvas.click() ) ;
                            } ;
                        } ;
                    document.getElementById("modal_close").onclick=()=>{
                        screen.orientation.onchange=()=>{};
                        if (globalSettings.fullscreen=="big_picture") {
                            if ( document.fullscreenElement ) {
                                document.exitFullscreen() ;
                            }
                        }
                        document.getElementById('modal_id').style.display='none';
                        };
                    document.getElementById("modal_down").onclick=()=> {
                        this.getURL( name )
                        .then( url => {
                            const link = document.createElement("a");
                            link.download = name;
                            link.href = url;
                            link.style.display = "none";

                            document.body.appendChild(link);
                            link.click(); // press invisible button
                            
                            // clean up
                            // Add "delay" see: https://www.stefanjudis.com/snippets/how-trigger-file-downloads-with-javascript/
                            setTimeout( () => {
                                window.URL.revokeObjectURL(link.href) ;
                                document.body.removeChild(link) ;
                            });
                        }) ;
                    } ;
                    ((globalSettings.fullscreen=="big_picture") ?
                        document.documentElement.requestFullscreen()
                        : Promise.resolve() )
                    .finally( _ => {
                        img2.src=url2;
                        document.getElementById("modal_caption").innerText=this.images.find(e=>e.image==name).comment;
                        document.getElementById("modal_id").style.display="block";
                        });
                    })
                .catch( err => globalLog.err(err) ) ;
            };

            img.src=url ;
            })
        .catch( err => globalLog.err(err)) ;
        return canvas ;
    }

    print_display( name ) {
        // full sized but cropped
        const img = new Image() ;
        const canvas = document.createElement("canvas");
        let crop = [] ;
        this.getURL( name )
        .then( url => {
            img.onload = () => {
                URL.revokeObjectURL(url) ;
                crop = this.images.find( i => i.image==name)?.crop ?? null ;
                if ( !crop || crop.length!=4 ) {
                    crop = [0,0,img.naturalWidth,img.naturalHeight] ;
                }
                canvas.width = crop[2] ;
                canvas.height = crop[3] ;
                canvas.getContext("2d").drawImage( img, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3] ) ;
                } ;
            img.src=url ;
            canvas.classList.add("print_pic");
            })
        .catch( err => globalLog.err(err)) ;
        return canvas ;
    }

    displayAll() {
        return this.images.map( k=> this.displayClickable(k.image,"medium_pic") ) ;
    }    
}

class Thumb {
    constructor() {
        this.Thumbs = {} ;
    }

    setup() {
        // after onload
        this.canvas = document.getElementById("thumbnail"); // defines the thumbnail size
        this.pick = document.getElementById("MainPhotos");
        this.ctx = this.canvas.getContext( "2d" ) ;
        this.NoPicture = this._no_picture() ;
    }

    _no_picture() {
        const img = document.getElementById("NoPicture");
        this.ctx.drawImage( img, 0, 0, this.canvas.width, this.canvas.height ) ;
        this.canvas.toBlob( (blob) => {
            this.NoPicture = blob ;
            }) ;
    }
    
    _load( doc ) {
        // attachments need not be included in doc -- will pull in separately
        const pid = doc._id ;
        if ( (doc?.images??[]).length<1) {
            this.remove(pid) ;
            return ;
        }

        globalDatabase.db.getAttachment(pid, doc.images[0].image )
        .then(data => {
            const url = URL.createObjectURL(data) ;
            const t_img = new Image();
            t_img.onload = () => {
                URL.revokeObjectURL(url) ;
                let crop = doc.images[0]?.crop ;
                if ( !crop || crop.length!=4 ) {
                    crop = [0,0,t_img.naturalWidth,t_img.naturalHeight] ;
                }
                // sw/sh in canvas units
                const [iw,ih] = rightSize( this.canvas.width, this.canvas.height, crop[2], crop[3]  ) ;
                // center and crop to maintain 1:1 aspect ratio
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage( t_img, crop[0] + (crop[2]-iw)/2, crop[1] + (crop[3]-ih)/2, iw, ih, 0, 0, this.canvas.width, this.canvas.height ) ;
                this.canvas.toBlob( (blob) => {
                    this.Thumbs[pid] = blob;
                    let img = this.pick.querySelector(`img[alt="${pid}"]`);
                    if ( img ) {
                        this.displayThumb( img, pid ) ;
                    } else {
                        img = new Image(100,100);
                        this.displayThumb( img, pid ) ;
                        img.classList.add("MainPhoto");
                        img.onclick = () => {
                            globalPot.select( pid ) ;
                            globalPage.show("PotMenu") ;
                        } ;
                        this.pick.appendChild( img ) ;
                        img.alt = pid ;
                    }
                    },`image/${globalSettings?.img_format??"png"}`) ;
                };
            t_img.src = url ;
        })
        .catch( err => globalLog.err(err) );
    }

    _firstload( doc ) {
        // no need to check for existing
        const pid = doc._id ;
        if ( (doc?.images??[]).length<1) {
            return ;
        }

        globalDatabase.db.getAttachment(pid, doc.images[0].image )
        .then(data => {
            const url = URL.createObjectURL(data) ;
            const t_img = new Image();
            t_img.onload = () => {
                URL.revokeObjectURL(url) ;
                let crop = doc.images[0]?.crop ;
                if ( !crop || crop.length!=4 ) {
                    crop = [0,0,t_img.naturalWidth,t_img.naturalHeight] ;
                }
                // sw/sh in canvas units
                const [iw,ih] = rightSize( this.canvas.width, this.canvas.height, crop[2], crop[3]  ) ;
                // center and crop to maintain 1:1 aspect ratio
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage( t_img, crop[0] + (crop[2]-iw)/2, crop[1] + (crop[3]-ih)/2, iw, ih, 0, 0, this.canvas.width, this.canvas.height ) ;
                this.canvas.toBlob( (blob) => {
                    this.Thumbs[pid] = blob;
                    const img = new Image(100,100);
                    this.displayThumb( img, pid ) ;
                    img.classList.add("MainPhoto");
                    img.onclick = () => {
                        globalPot.select( pid ) ;
                        globalPage.show("PotMenu") ;
                    } ;
                    this.pick.appendChild( img ) ;
                    img.alt = pid ;
                    }, `image/${globalSettings?.img_format??"png"}`) ;
                };
            t_img.src = url ;
        })
        .catch( err => globalLog.err(err) );
    }

    getOne( pid = potId ) {
        return globalDatabase.db.get( pid )
        .then( doc => this._load(doc) )
        .catch( err => globalLog.err(err) );
    }

    getAll() {
        this.pick.innerHTML="";
        globalPot.getAllIdDoc()
        .then( docs => {
            if ( 'requestIdleCallback' in window ) {
                if ( docs.rows.length > 0 ) {
                    window.requestIdleCallback( () => this.getAllList(docs.rows),{timeout:100});
                }
            } else {
                docs.rows.forEach( r => this._firstload( r.doc ) ) ;
            }
            })
        .catch( err => globalLog.err(err) ) ;
    }

    getAllList( rows ) {
        const r = rows.pop() ;
        this._load( r.doc ) ;
        if ( rows.length > 0 ) {
            window.requestIdleCallback( () => this.getAllList( rows ), {timeout:100} ) ;
        }
    }

    displayThumb( target, pid = potId ) {
        const url = URL.createObjectURL( (pid in this.Thumbs ) ? this.Thumbs[pid] : this.NoPicture ) ;
        target.onload = () => URL.revokeObjectURL( url ) ;
        target.src = url ;
    }

    remove( pid ) {
        const img = this.pick.querySelector(`img[alt="${pid}"]`);
        if ( img ) {
            delete this.Thumbs[img.alt];
            this.pick.removeChild( img ) ;
        }
    }
}

globalThumbs = new Thumb() ;

class SortTable {
    constructor( collist, tableId, aliaslist=[] ) {
        this.tbl = document.getElementById(tableId);
        this.tbl.innerHTML = "";
        this.collist = collist;
        
        // alias-list is a list in form (list of lists):
        //[ [fieldname, aliasname, transformfunction],...]
        
        this.aliases={}; // Eventually will have an alias and function for all columns, either default, or specified
        this.collist.forEach( f => this.aliasAdd(f) ) ; // default aliases
        aliaslist.forEach( a => this.aliasAdd(a[0],a[1],a[2]) );

        // Table Head
        const header = this.tbl.createTHead();
        const row = header.insertRow(0);
        row.classList.add('head');
        this.collist.forEach( (f,i) => row.insertCell(i).outerHTML=`<th>${this.aliases[f].name}</th>` );

        // Table Body
        const tbody = document.createElement('tbody');
        this.tbl.appendChild(tbody);

        this.dir = 1;
        this.lastth = -1;
        this.tbl.onclick = this.allClick.bind(this);
    }

    aliasAdd( fieldname, aliasname=null, transformfunction=null ) {
        if ( !(fieldname in this.aliases) ) {
            // Add an entry (currently empty) for this column
            this.aliases[fieldname] = {} ;
        }
        this.aliases[fieldname].name = aliasname ?? fieldname ;
        this.aliases[fieldname].value = ((record)=>{
            try {
                if ( transformfunction==null ) {
                    return record[fieldname];
                } else {
                    return transformfunction(record) ;
                }
            } catch(e) {
                globalLog.err(e) ;
                return "";
            }
            }) ;
    }

    fill( doclist ) {
        // typically called with doc.rows from allDocs
        const tbody = this.tbl.querySelector('tbody');
        tbody.innerHTML = "";
        //let collist = this.collist;
        doclist.forEach( (doc) => {
            const row = tbody.insertRow(-1);
            const record = doc.doc;
            row.setAttribute("data-id",record._id);
            /* Select and edit -- need to make sure selection is complete*/
            ['click']
            .forEach( (e) => row.addEventListener( e, () => this.selectandedit( record._id ) ) ) ;
            this.collist.forEach( (colname,i) => {
                const c = row.insertCell(i);
                c.innerHTML=(this.aliases[colname].value)(record) ;
            });
        });
        this.highlight();
    }
    
    selectandedit( id ) {
        this.selectFunc( id );
        this.editpage() ;
    }
  
    allClick(e) {
        if (e.target.tagName == 'TH') {
            return this.sortClick(e);
        }
    }

    resort() {
        if ( this.lastth < 0 ) {
            this.lastth = 0;
            this.dir = 1;
        }
        this.sortGrid(this.lastth);
    }

    sortClick(e) {
        const th = e.target;
        if ( th.cellIndex == this.lastth ) {
            this.dir = -this.dir;
        } else {
            this.dir = 1;
            this.lastth = th.cellIndex;
        }
        // if TH, then sort
        // cellIndex is the number of th:
        //   0 for the first column
        //   1 for the second column, etc
        this.sortGrid(th.cellIndex);
    }

    sortGrid(colNum) {
        const tbody = this.tbl.querySelector('tbody');
        if ( tbody == null ) {
            // empty table
            return;
        }

        const rowsArray = Array.from(tbody.rows);

        let type = "number";
        rowsArray.some( (r) => {
            const c = r.cells[colNum].innerText;
            if ( c == "" ) {
                //empty
            } else if ( isNaN( Number(r.cells[colNum].innerText) ) ) {
                type = "string";
                return true;
            } else {
                return true;
            }
        });

        // compare(a, b) compares two rows, need for sorting
        const dir = this.dir;
        let compare;

        switch (type) {
            case 'number':
                compare = (rowA, rowB) => (rowA.cells[colNum].innerText - rowB.cells[colNum].innerText) * dir;
                break;
            case 'string':
                compare = (rowA, rowB) => rowA.cells[colNum].innerText > rowB.cells[colNum].innerText ? dir : -dir;
                break;
        }

        // sort
        rowsArray.sort(compare);

        tbody.append(...rowsArray);
        this.highlight();
    }

    highlight() {
        const Rs = Array.from(this.tbl.rows);
        Rs.forEach( r => r.classList.remove('choice'));
        const id = this.selectId();
        if ( id ) {
            const sr = Rs.filter( r => r.getAttribute('data-id')==id );
            if ( sr.length > 0 ) {
                sr.forEach( r => r.classList.add('choice'));
                sr[0].scrollIntoView();
            }
        }
    }
}

class ThumbTable extends SortTable {
    constructor( collist, tableId, aliaslist=[] ) {
        collist.unshift("image");
        super( collist, tableId, aliaslist ) ;
    }

    fill( doclist ) {
        // typically called with doc.rows from allDocs
        const tbody = this.tbl.querySelector('tbody');
        tbody.innerHTML = "";
        doclist.forEach( (doc) => {
            const row = tbody.insertRow(-1);
            const record = doc.doc;
            row.setAttribute("data-id",record._id);
            /* Select and edit -- need to make sure selection is complete*/
            ['click']
            .forEach( (e) => row.addEventListener( e, () => this.selectandedit( record._id ) ) ) ;
            // thumb
            const img = new Image(100,100);
            globalThumbs.displayThumb( img, record._id ) ;
            row.insertCell(-1).appendChild(img);
            // cells
            this.collist
            .slice(1)
            .forEach( colname => {
                const c = row.insertCell(-1);
                c.innerHTML=(this.aliases[colname].value)(record) ;
            });
        });
        this.highlight();
    }
    
}

class PotTable extends ThumbTable {
    constructor(
        collist=["type","series","start_date" ],
        tableId="AllPieces",
        aliaslist=
            [
                ["Thumbnail","Picture", (doc)=> `${doc.artist}`],
                ['start_date','Date',null],
                ['series','Series',null],
                ['type','Form',null]
            ] ) {
        super( collist, tableId, aliaslist ) ;
    }

    selectId() {
        return potId;
    }

    selectFunc(id) {
        globalPot.select(id) ;
    }

    editpage() {
        globalPage.show("PotMenu");
    }
}

class MultiTable {
    constructor( cat_func, collist=["type","series","start_date" ], aliaslist=[] ) {
        // cat_func outputs a category array:
        // [] or  [category] or [category1, category2,...]
        // sort_func operates on a doc record

        /* Example:
         *  new MultiTable( "Artist", (doc)=>[doc.artist], "series",document.getElementById("MultiTableContent") );
        */

        // catagories
        this.cat_ob = {} ;

        // parent container
        const parent = document.getElementById("MultiTableContent") ;
        parent.innerHTML="";
        const fieldset = document.getElementById("templates").querySelector(".MultiFieldset");
        
        this.apply_cat( cat_func )
        .then( () => Object.keys(this.cat_ob).toSorted().forEach( cat => {
            // fieldset holds a sorttable
            const fs = fieldset.cloneNode( true ) ;
            fs.querySelector(".multiCat").innerText = `${cat} (${this.cat_ob[cat].rows.length})` ;

            // setup table
            const tb = fs.querySelector("table");
            tb.id = `MT${cat}` ;
            tb.style.display="";
            parent.appendChild(fs) ;
            const cl = [...collist] ;
            this.cat_ob[cat].table=new PotTable( cl, tb.id ) ;

            // put data in it
            this.cat_ob[cat].table.fill(this.cat_ob[cat].rows) ;

            // fieldset open/close toggle
            this.cat_ob[cat].visible=true ;
            const plus = fs.querySelector(".triggerbutton") ;
            this.cat_ob[cat].button = plus;
            plus.onclick = () => {
                if ( this.cat_ob[cat].visible ) {
                    plus.innerHTML= "&#10133;" ;
                    tb.style.display = "none" ;
                    this.cat_ob[cat].visible = false ;
                } else {
                    plus.innerHTML= "&#10134;" ;
                    tb.style.display = "" ;
                    this.cat_ob[cat].visible = true ;
                }
            } ;                
        })) ;
    }
    
    // apply the function on all records to get categorized records
    apply_cat( cat_func ) {
        const a2a = [] ;
        return globalPot.getAllIdDoc()
        .then( docs => docs.rows
                        .forEach( r => (cat_func( r.doc )??['unknown'])
                            .forEach( c => a2a.push( [c,r] ))
                             ))
        .then( () => this.arrays2object( a2a ) );
    }
        
    // split into separate records per category
    arrays2object( arrays ) {
        arrays.forEach( ([k,v]) => {
            if ( k in this.cat_ob ) {
                this.cat_ob[k].rows.push(v) ;
            } else {
                this.cat_ob[k]={rows:[v]} ;
            }
        }) ;
    }
    
    open_all() {
        Object.keys(this.cat_ob).forEach(cat => {
            if ( ! this.cat_ob[cat].visible ) {
                this.cat_ob[cat].button.click() ;
            }
        });
    }
                
    close_all() {
        Object.keys(this.cat_ob).forEach(cat => {
            if ( this.cat_ob[cat].visible ) {
                this.cat_ob[cat].button.click() ;
            }
        });
    }
}

class SearchTable extends ThumbTable {
    constructor() {
        super( 
        ["Field","Text"], 
        "SearchList"
        );
    }

    fill( doclist ) {
        // typically called with doc.rows from allDocs
        const tbody = this.tbl.querySelector('tbody');
        tbody.innerHTML = "";
        doclist.forEach( (doc) => {
            const row = tbody.insertRow(-1);
            const record = doc.doc;
            row.setAttribute("data-id",record._id);
            /* Select and edit -- need to make sure selection is complete*/
            ['click']
            .forEach( (e) => row.addEventListener( e, () => this.selectandedit( record._id, record.Link ) ) ) ;
            // thumb
            const img = new Image(100,100);
            globalThumbs.displayThumb( img, record._id ) ;
            row.insertCell(-1).appendChild(img);
            // cells
            this.collist
            .slice(1)
            .forEach( colname => {
                const c = row.insertCell(-1);
                c.innerHTML=(this.aliases[colname].value)(record) ;
            });
        });
        this.highlight();
    }

    selectId() {
        return globalSearch.select_id;
    }

    selectFunc(id) {
        globalSearch.select_id = id ;
        globalTable.highlight();
    }
    
    // for search -- go to a result of search
    selectandedit( id, page ) {
        globalPot.select(id) ;
        globalPage.show( page ) ;
    }
}

class Search { // singleton class
    constructor() {
        this.select_id = null ;

        this.field_alias={} ;
        this.field_link={} ;
                this.fields = [] ;

        this.structStructure= ({
                        PotEdit:    structData.Data,
                        PotMenu:     structData.Images,
                        });

        // Extract fields fields
        Object.entries(this.structStructure).forEach( ([k,v]) =>
                        this.structFields(v)
                        .forEach( fn => {
                                this.field_link[fn]=k ;
                                this.fields.push(fn);
                                })
                        );
    }

    resetTable () {
        this.setTable([]);
    } 

    select(id) {
        this.select_id = id;
    }

    toTable() {
        const needle = document.getElementById("searchtext").value;

        if ( needle.length == 0 ) {
            return this.resetTable();
        }
        globalDatabase.db.search(
            { 
                    query: needle,
                    fields: this.fields,
                    highlighting: true,
                    mm: "80%",
            })
        .then( x => x.rows.map( r =>
            Object.entries(r.highlighting)
            .map( ([k,v]) => ({
                    _id:r.id,
                    Field:this.field_alias[k],
                    Text:v,
                    Link:this.field_link[k],
                    })
                )) 
            .flat()
            .map( r=>({doc:r})) )
        .then( x => x.rows.map( r =>
            Object.entries(r.highlighting)
            .map( ([k,v]) => ({
                _id:r.id,
                Field:this.field_alias[k],
                Text:v,
                Link:this.field_link[k],
                })
            )) ) 
        .then( res => res.flat() )
        .then( res => res.map( r=>({doc:r}))) // encode as list of doc objects
        .then( res=>this.setTable(res)) // fill the table
/*
        .catch(err=> {
            globalLog.err(err);
            this.resetTable();
            });
            * */ ;
    }

    setTable(docs=[]) {
        globalTable.fill(docs);
    }

    structParse( struct ) {
        return struct
        .filter( e=>!(['date','image'].includes(e.type)))
        .map(e=>{
            const name=e.name;
            const alias=e?.alias??name;
            if ( ['array','image_array'].includes(e.type) ) {
                return this.structParse(e.members)
                .map(o=>({name:[name,o.name].join("."),alias:[alias,o.alias].join(".")})) ;
            } else {
                return ({name:name,alias:alias});
            }
            })
        .flat();
    }
        
    structFields( struct ) {
        const sP = this.structParse( struct ) ;
        sP.forEach( o => this.field_alias[o.name]=o.alias );
        return sP.map( o => o.name ) ;
    }
}

// Set up text search
globalSearch = new Search();

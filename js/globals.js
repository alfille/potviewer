/* Potholder project
 * Ceramic production database application
 * See https://github.com/alfille/potholder
 * or https://alfille.online
 * by Paul H Alfille 2024
 * MIT license
 * */

/* jshint esversion: 11 */

const structGeneralPot = [
    {
        name:  "type",
        alias: "Form",
        hint:  "Form of the piece",
        type:  "list",
        choices:  ["bowl","plate","flowerpot"],
        query: "qType",
    },
    {
        name:  "series",
        alias: "Series",    
        hint:  "Which creative wave?",
        type:  "list",
        query: "qSeries",
    },
    {
        name:  "start_date",
        alias: "Start date",
        type:  "date",
        hint:  "Date work started",
    },
    {
        name:  "artist",
        alias: "Artist",
        hint:  "Creator of this piece",
        type:  "list",
        query: "qArtist",
    },
    {
        name:  "general_comment",
        alias: "General comments",
        hint:  "Overall comments on piece",
        type:  "textarea",
    },
    {
        name:  "stage",
        alias: "Stage",
        hint:  "Stage of creation",
        type:  "radio",
        choices: ["greenware","bisqued","kiln","finished"],
    },
    {
        name:  "kiln",
        alias: "Kiln",
        hint:  "Kiln firing type",
        type:  "radio",
//        choices: ["greenware","bisque","oxidation","reduction","soda","raku","garbage","salt"],
        choices: ["none","oxidation","reduction","soda","raku",],
    },
    {
        name:  "weight_start",
        alias: "Starting weight",
        hint:  "Weight (in pounds) of the raw clay",
        type:  "text",
    },
    {
        name:  "construction",
        hint:  "techniques",
        type:  "checkbox",
        choices: ["wheel","slab","handbuilt","coil","pinch"],
    },
    {
        name:  "clay",
        alias: "Clay",
        hint:  "Clays used in piece",
        type:  "checkbox",
        choices: ["B-mix","Brown","Black","Brooklyn Red","Porcelain","Other"],
    },
    {
        name:  "clay_comment",
        alias: "Clay notes",
        hint:  "Comments on the clays",
        type:  "textarea",
    },
    {
        name:  "glaze",
        alias: "Glazes",
        type:  "array",
        members: [
            {
                name:  "type",
                alias: "Glaze",
                type:  "list",
                query: "qGlaze",
            },
            {
                name:  "comment",
                alias: "Notes",
                type:  "textarea",
            }
        ],
    },
    {
        name:  "weight_end",
        alias: "Final weight",
        hint:  "Weight (in pound) of the finished piece",
        type:  "text",
    },
    {
        name:  "location",
        hint:  "Current location",
        type:  "list",
        query: "qLocation",
    },
];

const structImages = [
    {
        name:  "images",
        alias: "Images",
        type:  "image_array",
        members: [
            {
                name:  "image",
                type:  "image",
            },
            {
                name:  "comment",
                alias: "Notes",
                hint:  "Notes about this photo",
                type:  "textarea",
            },
            {
                name:  "date",
                type:  "date",
                alias: "Date",
                hint:  "Date photo was taken",
            },
            {
                name:  "crop",
                type:  "crop",
            },
        ]
    }
];

globalThis.structData = {
    Data: structGeneralPot,
    Images: structImages,
};
        
globalThis.structRemoteUser = [
    {
        name:  "local",
        alias: "Local only",
        hint:  "No CouchDB server to replicate with",
        type:  "bool",
    },
    {
        name:  "username",
        hint:  "Your user name for access",
        type:  "text",
    },
    {
        name:  "password",
        hint:  "Your password for access",
        type:  "text",
    },    
    {
        name:  "address",
        alias: "Remote database server address",
        hint:  "alfille.online -- don't include database name",
        type:  "text",
    },
    {
        name:  "raw",
        alias: "process address",
        hint:  "Fix URL with protocol and port",
        type:  "radio",
        choices: ["fixed","raw"],
    },
    {
        name:  "database",
        hint:  'Name of ceramic database (e.g. "potholder"',
        type:  "text",
    },
];

globalThis.structDatabaseInfo = [
    {
        name:  "db_name",
        alias: "Database name",
        hint:  "Name of underlying database",
        type:  "text",
    },
    {
        name:  "doc_count",
        alias: "Document count",
        hint:  "Total number of undeleted documents",
        type:  "number",
    },
    {
        name:  "update_seq",
        hint:  "Sequence number",
        type:  "number",
    },
    {
        name:  "adapter",
        alias: "Database adapter",
        hint:  "Actual database type used",
        type:  "text",
    },
    {
        name:  "auto_compaction",
        alias: "Automatic compaction",
        hint:  "Database compaction done automaticslly?",
        type:  "text",
    },
];

globalThis.structSettings = [
    {
        name: "console",
        alias: "Console",
        hint: "Output errors to developer console (for debugging)",
        type: "bool",
    },
    {
        name: "img_format",
        alias: "Thumbnail format",
        hint: "Image encoding of thumbnail images",
        type: "radio",
        choices: ["png","jpeg","webp"],
    },
    {
		name: "fullscreen",
		alias: "Display full screen",
		hint: "Hide browser meniu choices",
		type: "radio",
		choices: ["never","big_picture","always"],
	}
] ;

// globals cookie backed
globalThis. potId = null ;

// singleton class instances
globalThis. globalPage = null ;
globalThis. globalPotData = null ;
globalThis. globalTable = null ;
globalThis. globalDatabase = null ;
globalThis. globalLog = null ;
globalThis. globalPot = null ;
globalThis. globalStorage = null ;
globalThis. globalSearch = null;
globalThis. globalThumbs = null;
globalThis. globalSettings = {} ;

globalThis. rightSize = ( imgW, imgH, limitW, limitH ) => {
    const h = limitW * imgH / imgW ;
    if ( h <= limitH ) {
        return [ limitW, h ] ;
    } else {
        return [ limitH * imgW / imgH, limitH ] ;
    }
} ;

globalThis. cloneClass = ( fromClass, target ) => {
    document.getElementById("templates").
    querySelector(fromClass)
        .childNodes
        .forEach( cc => target.appendChild(cc.cloneNode(true) ) );
} ;

export class CSV { // convenience class
    constructor() {
        this.columns = [
            "type", "series", "location", "start_date", "artist", "firing", "weight_start","weight_end", "construction", "clay.type", "glaze.type", "kilns.kiln"
            ] ;
        this.make_table() ;
    }
    
    download( csv ) {
        const filename = `${globalDatabase.database}_${globalDatabase.username}.csv` ;
        const htype = "text/csv" ;
        //htype the file type i.e. text/csv
        const blub = new Blob([csv], {type: htype});
        const link = document.createElement("a");
        link.download = filename;
        link.href = window.URL.createObjectURL(blub);
        link.style.display = "none";

        document.body.appendChild(link);
        link.click(); // press invisible button
        
        // clean up
        // Add "delay" see: https://www.stefanjudis.com/snippets/how-trigger-file-downloads-with-javascript/
        setTimeout( () => {
            window.URL.revokeObjectURL(link.href) ;
            document.body.removeChild(link) ;
        });
    }

    make_headings() {
        return this.make_row( this.columns.map( c => c.split(".")[0] ) ) ;
    } 

    get_text( combined_field, doc ) {
        const com = combined_field.split(".") ;
        switch (com.length) {
            case 0:
                return "" ;
            case 1:
                if ( com[0] in doc ) {
                    return doc[com[0]] ;
                }
                return "" ;

            case 2:
                if ( com[0] in doc ) {
                    return doc[com[0]].map( s => s[com[1]] ).join(", ") ;
                }
                return "" ;

        }
    } 

    make_row( row ) {
        return row
        .map( r => (isNaN(r) || (r=="")) ? `"${r}"` : r )
        .join(",");
    }
    
    make_table() {
        globalPot.getAllIdDoc()
        .then( docs => docs.rows.map( r => this.make_row( this.columns.map( c => this.get_text( c, r.doc ) ) ) ) )
        .then( data => data.join("\n") )
        .then( data => [this.make_headings(), data].join("\n") )
        .then( csv => this.download( csv ) )
        .catch( err => globalLog.err(err) ) ;
    }
}

globalThis.csv = () => new CSV() ;

class Log{
    constructor() {
        this.list = [];
    }
    
    err( err, title=null ) {
        // generic console.log of error
        const ttl = title ?? globalPage.current() ;
        const msg = err.message ?? err ;
        this.list.push(`${ttl}: ${msg}`);
        if ( globalSettings?.console == "true" ) {
            console.group() ;
            console.log( ttl, msg ) ;
            console.trace();
            console.groupEnd();
        }
        if ( globalPage.current() == "ErrorLog" ) {
            // update
            this.show();
        }
    }
    
    clear() {
        this.list = ["Error log cleared"] ;
        this.show();
    }
    
    show() {
        const cont = document.getElementById("ErrorLogContent") ;
        cont.innerHTML="";
        const ul = document.createElement('ul');
        cont.appendChild(ul);
        this.list
        .forEach( e => {
            const l = document.createElement('li');
            l.innerText=e;
            //l.appendChild( document.createTextNode(e) ) ;
            ul.appendChild(l) ;
        });
    }
}
globalLog = new Log() ;

class DatabaseManager { // convenience class
    // Access to remote (cloud) version of database
    constructor() {
        // remoteCouch contents
        this.username = null ;
        this.password = null ;
        this.database = null ;
        this.address  = null ;
        this.local    = null ;
        
        this.remoteDB = null;
        this.problem = false ; // separates real connection problem from just network offline
        this.synctext = document.getElementById("syncstatus");
        this.db = null ;
        
    }
    
    load() {
        ["username","password","database","address","local"].forEach( x => this[x]=globalStorage.local_get(x) );
    }
    
    store() {
        ["username","password","database","address","local"].forEach( x => globalStorage.local_set(x,this[x]) );
    }
    
    acquire_and_listen() {        
        // Get remote DB from localStorage if available
        this.load();
        const cookie = globalStorage.get("remoteCouch");
        if ( cookie !== null ) { // legacy
            ["username","password","database","address"].forEach( x => this[x] = this[x] ?? cookie[x] );
            globalStorage.del("remoteCouch") ;
        }
            
        // Get Remote DB fron command line if available
        const params = new URL(location.href).searchParams;
        ["username","password","database","address","local"].forEach( c => {
            const gc = params.get(c) ;
            if ( ( gc!==null ) && ( gc !== this[c] ) ) {
                this[c] = gc ;
                globalPage.reset() ;               
            }
        });
        this.store();
             
        // set up monitoring
        window.addEventListener("offline", _ => this.not_present() );
        window.addEventListener("online", _ => this.present() );

        // initial status
        const _ = navigator.onLine ? this.present() : this.not_present() ;
    }
    
    open() { // local
        if ( this.database && (this.database !== "") ) {
            this.db = new PouchDB( this.database, {auto_compaction: true} ); // open local copy
        }
    }

    
    present() {
        this.status( "good", "--network present--" ) ;
    }

    not_present() {
        this.status( "disconnect", "--network offline--" ) ;
    }

    // Initialise a sync process with the remote server
    foreverSync() {
        document.getElementById( "userstatus" ).value = this.username;

        if ( this.local=="true" ) { // local -- no sync
            this.status("good","Local database only (no replication)");
            return ;
        }
            
        if ( this.username && this.password && this.database && this.address  ) {
            this.remoteDB = new PouchDB( [this.address, this.database].join("/") , {
                "skip_setup": "true",
                "auth": {
                    "username": this.username,
                    "password": this.password,
                    },
                });
        } else {
            globalLog.err("Bad DB specification");
            this.remoteDB = null;
        }
        if ( this.remoteDB ) {
            this.status( "good","download remote database");
            this.db.replicate.from( this.remoteDB )
                .catch( (err) => this.status("problem",`Replication from remote error ${err.message}`) )
                .finally( _ => this.syncer() );
        } else {
            this.status("problem","No remote database specified!");
        }
    }
    
    syncer() {
        this.status("good","Starting database intermittent sync");
        globalDatabase.db.sync( this.remoteDB ,
            {
                live: true,
                retry: true,
                filter: (doc) => doc._id.indexOf('_design') !== 0,
            } )
            .on('change', ()       => this.status( "good", "changed" ))
            .on('paused', ()       => this.status( "good", "quiescent" ))
            .on('active', ()       => this.status( "good", "actively syncing" ))
            .on('denied', ()       => this.status( "problem", "Credentials or database incorrect" ))
            .on('complete', ()     => this.status( "good", "sync stopped" ))
            .on('error', (err)     => this.status( "problem", `Sync problem: ${err.reason}` ));
    }
    
    status( state, msg ) {
        switch (state) {
            case "disconnect":
                document.body.style.background="#7071d3"; // Orange
                if ( this.lastState !== state ) {
                    globalLog.err(msg,"Network status");
                }
                break ;
            case "problem":
                document.body.style.background="#d72e18"; // grey
                globalLog.err(msg,"Network status");
                this.problem = true ;
                break ;
            case "good":
            default:
                document.body.style.background="#172bae"; // heppy blue
                if ( this.lastState !== state ) {
                    globalLog.err(msg,"Network status");
                }
                this.problem = false ;
                break ;
        }
        this.synctext.value = msg ;
    }
            
    SecureURLparse( url ) {
        let prot = "https";
        let addr = url;
        let port = "6984";
        let spl = url.split("://") ;
        if (spl.length < 2 ) {
            addr=spl[0];
        } else {
            prot = spl[0];
            addr = spl[1];
        }
        spl = addr.split(":");
        if (spl.length < 2 ) {
            addr=spl[0];
        } else {
            addr = spl[0];
            port = spl[1];
        }
        return [prot,[addr,port].join(":")].join("://");
    }

    // Fauxton link
    fauxton() {
        window.open( `${globalDatabase.address}/_utils`, '_blank' );
    }
    
    clearLocal() {
        const remove = confirm("Remove the eMission data and your credentials from this device?\nThe central database will not be affected.") ;
        if ( remove ) {
            globalStorage.clear();
            // clear (local) database
            globalDatabase.db.destroy()
            .finally( _ => location.reload() ); // force reload
        } else {
            globalPage.show( "MainMenu" );
        }
    }

}
globalDatabase = new DatabaseManager() ;

class Cookie { //convenience class
    // 2 versions, one with values placed in global scope, the other purely local values
    
    set( cname, value ) {
        // From https://www.tabnine.com/academy/javascript/how-to-set-cookies-javascript/
        this.local_set( cname, value ) ;
        globalThis[cname] = value;
    }
    
    local_set( cname, value ) {
        localStorage.setItem( cname, JSON.stringify(value) );
    }

    del( cname ) {
        this.local_del(cname);
        globalThis[cname] = null;
    }
    
    local_del( cname ) {
        localStorage.removeItem(cname);
    }
    
    get( cname ) {
        // local storage
        const ls = this.local_get( cname ) ;
        if ( ls ) {
            globalThis[cname] = ls;
            return ls ;
        }

        // legacy cookie
        const name = `${cname}=`;
        let ret = null ;
        decodeURIComponent(document.cookie).split('; ').filter( val => val.indexOf(name) === 0 ).forEach( val => {
            try {
                ret = JSON.parse( val.substring(name.length) );
                }
            catch(err) {
                ret =  val.substring(name.length);
                }
        });
        this.set(cname,ret) ; // put in local storage
        globalThis[cname] = ret;
        // Now delete cookie version
        // From https://www.w3schools.com/js/js_cookies.asp
        document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=None; Secure; path=/;` ;
        return ret;
    }
    
    local_get( cname ) {
        // local storage
        const ls = localStorage.getItem(cname);
        if ( ls ) {
            try {
                return JSON.parse( ls ) ;
            }
            catch(err) {
                return ls ;
            }
        }
        return null ;
    }

    clear() {
        this.local_clear();
    }
    
    local_clear() {
        localStorage.clear();
    }
}
globalStorage = new Cookie() ;

class MoulinetteNavigationTools {
  
  /**
   * Returns a HTML representing all the scenes
   */
  static getNavigationAsHTML(folder, hideEmpyFolders, flattenStructure) {
    if(!folder) {
      return ""
    }

    const hasSubFolder = folder.children && folder.children.length > 0
    const hasScene = folder.contents && folder.contents.length > 0
    
    const folders = []
    if(hasSubFolder) {

      let sortedFolders = folder.children
      if(folder.sorting == "a") sortedFolders.sort((a,b) => a.folder?.name.toLowerCase().localeCompare(b.folder?.name.toLowerCase()))
      else if(folder.sorting == "m") sortedFolders.sort((a,b) => a.sort-b.sort)

      sortedFolders.forEach((c) => {
        if(c.folder) {
          const html = MoulinetteNavigationTools.getNavigationAsHTML(c.folder, hideEmpyFolders, flattenStructure)         
          if(html) folders.push(html)
        }
      })
    }

    const sceneMap = new Map();
    if(hasScene) {
      let sortedScenes = duplicate(folder.contents)
      if(folder.sorting == "a") sortedScenes.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      else if(folder.sorting == "m") sortedScenes.sort((a,b) => a.sort-b.sort)
      
      // merge scenes based on regex
      let rx = /(N\-?\d+)$/g;
      sortedScenes.forEach((sc) => {
        const match = sc.name.match(rx)
        let base = sc.name
        let name = sc.name
        if(match) {
          base = sc.name.substring(0, sc.name.length - match[0].length).trim()
          name = match[0]
        } 
        if(!sceneMap.has(base)) {
          sceneMap.set(base, [])
        }
        sceneMap.get(base).push({ id: sc._id, name: name})
      });
    }

    // skip empty folder structures
    if(!hasScene && folders.length == 0 && hideEmpyFolders) return null

    const flatStructure = flattenStructure && folders.length == 0 && sceneMap.size <= 1
    let html = flatStructure ? "" : `${folder.name}`
    folders.forEach((f) => {
      html += f
    })
    if(hasScene) {
      html += `<ul class="scenes">`
      sceneMap.forEach((scenes,key) => {
        if(scenes.length ==  1) {
          html += `<li><a class="mouNavScene" href="" data-id="${scenes[0].id}">${scenes[0].name}</a></li>`
        } else {
          html += `<li> ${key}`
          scenes.forEach((sc) => html += ` <a class="mouNavScene sub" href="" data-id="${sc.id}">${sc.name}</a>` )
          html += "</li>"
        }
      })
      html += "</ul>"
    }
    
    return `<ul class="folders ${flatStructure ? "flat" : ""}"><li class="${flatStructure ? "flat" : ""}">${html}</li></ul>`
  }  

  /**
   * Update Moulinette Navigation based on selected folder
   */
  static updateMoulinetteNavigation() {
    if($("#mouNav").is(":hidden")) return // no update required

    // update navigation & events
    const html = MoulinetteNavigationTools.getNavigationAsHTML(
      game.moulinette.navigationtools, 
      game.settings.get("moulinette-navigation-tools", "hideEmpyFolders"),
      game.settings.get("moulinette-navigation-tools", "flattenStructure"),
    )
    $("#mouNav").html(`${html}<div class="actions"><a href="" class="help"><i class="fa-solid fa-circle-question"></i></a></div>`)
    $("#mouNav .mouNavScene").click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const link = $(ev.currentTarget)
      const id = link.data("id")
      const scene = game.scenes.get(id);
      if (ev.shiftKey) {
        scene.activate();
      } else {
        scene.view();
      }
    })
    $("#mouNav .help").click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.log("SHOW HELP")
    })
  }
}




Hooks.once("init", async function () {
  console.log("Moulinette Navigation Tools | Init") 

  game.settings.register("moulinette-navigation-tools", "hideEmpyFolders", {
    name: game.i18n.localize("mtte.configHideEmptyFolders"),
    hint: game.i18n.localize("mtte.configHideEmptyFoldersHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("moulinette-navigation-tools", "flattenStructure", {
    name: game.i18n.localize("mtte.configFlattenStructure"),
    hint: game.i18n.localize("mtte.configFlattenStructureHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("moulinette-navigation-tools", "currentFolder", { scope: "world", config: false, type: String, default: null })
});

Hooks.once("ready", async function() { 
  if(game.user.isGM && $("#nav-moulinette-toggle").length == 0) {
    $("#ui-top").prepend(`<a id="nav-moulinette-toggle" class="nav-item" role="button" alt="${game.i18n.localize("SCENES.ToggleNav")} (Moulinette)"><i class="fas fa-ellipsis"></i></a><ul id="mouNav" class="folders"/>`);  
    $("#nav-moulinette-toggle").click((ev) => { 
      $("#mouNav").toggle()
      MoulinetteNavigationTools.updateMoulinetteNavigation() 
    });
    // initialize folder
    const folder = game.folders.get(game.settings.get("moulinette-navigation-tools", "currentFolder"))
    if(folder) {
      game.moulinette.navigationtools = folder
    }
  }
});

Hooks.on("getSceneDirectoryFolderContext", (html, options) => {
  options.push({
    name: game.i18n.localize("mtte.navigation"),
    icon: '<i class="fa-solid fa-ellipsis"></i>',
    callback: async function(li) {
      const folderId = $(li).closest("li").data("folderId")
      game.moulinette.navigationtools = game.folders.get(folderId)
      game.settings.set("moulinette-navigation-tools", "currentFolder", folderId)
      MoulinetteNavigationTools.updateMoulinetteNavigation()
    },
    condition: li => {
      return true;
    },
  });
});
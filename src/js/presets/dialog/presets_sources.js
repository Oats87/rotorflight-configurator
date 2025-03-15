import PresetsSourceMetadata from "@/js/presets/sources/presets_source_metadata.js";
import SourcePanel from "@/js/presets/panels/source_panel.js";

export default class PresetsSourcesDialog {
    #dom = {
        buttonAddNew: null,
        buttonClose: null,
        divSourcesPanel: null,
        dialog: null,
    };

    #sourcePanels = [];

    #sourceSelectedPromiseResolve = null;

    constructor(domDialog) {
        this.#dom.dialog = domDialog;
    }

    load() {
        return new Promise(resolve => {
            this.#dom.dialog.load("./tabs/presets/SourcesDialog/SourcesDialog.html",
            () => {
                resolve();
            });
        }).then(() => { this.#setupDialog(); })
        .then(() => { this.#initializeSources(); });

    }

    show() {
        this.#dom.dialog[0].showModal();
        return new Promise(resolve => this.#sourceSelectedPromiseResolve = resolve);
    }

    collectActiveSources() {
        let activePresetsSources = [];
        for (let i = 0; i < this.#sourcePanels.length; i++) {
            if (!this.#sourcePanels[i].presetsSourceMetadata.active) {
                continue;
            }
            activePresetsSources.push(this.#sourcePanels[i]);
        }
        return activePresetsSources;
    }

    get isThirdPartyActive() {
        return this.#collectSourcesMetadata().filter(source => source.active && !source.official).length > 0;
    }

    #initializeSources() {
        let sourceMetadata = [];
        ConfigStorage.get('PresetSourcesMetadata', function(result) {
            if (result.PresetSourcesMetadata) {
                sourceMetadata = result.PresetSourcesMetadata;
            }
        });
        sourceMetadata.unshift(this.#createOfficialSource());
        for (let i = 0; i < sourceMetadata.length; i++) {
            console.log("adding new source panel");
            this.#addNewSourcePanel(sourceMetadata[i]);
        }
    }

    #saveSourcesMetadataToStorage() {
        ConfigStorage.set({'PresetSourcesMetadata': this.#collectSourcesMetadata(false).filter(function(sourceMetadata) { if (sourceMetadata == null) { return false; } return !sourceMetadata.official; } )});
    }

    #createOfficialSource() {
        const officialSource = new PresetsSourceMetadata("Rotorflight Official Presets", "https://github.com/Oats87/rotorflight-presets", "main");
        officialSource.official = true;
        officialSource.active = true;
        return officialSource;
    }

    #setupDialog() {
        this.#readDom();
        this.#setupEvents();
        this.#dom.buttonAddNew.on("click", () => this.#onAddNewSourceButtonClick());
        i18n.localizePage();
    }

    #onAddNewSourceButtonClick() {
        const presetSource = new PresetsSourceMetadata(i18n.getMessage("presetsSourcesDialogDefaultSourceName"), "", "");
        this.#addNewSourcePanel(presetSource).then(() => {
            this.#scrollDown();
            this.#updateSourcesFromPanels();
        });
    }

    #scrollDown() {
        this.#dom.divSourcesPanel.stop();
        this.#dom.divSourcesPanel.animate({scrollTop: `${this.#dom.divSourcesPanel.prop('scrollHeight')}px`});
    }

    #addNewSourcePanel(presetsSourceMetadata) {
        console.log("Adding new source panel");
        const sourcePanel = new SourcePanel(this.#dom.divSourcesPanel, presetsSourceMetadata);
        this.#sourcePanels.push(sourcePanel);
        return sourcePanel.load();
    }

    #setupEvents() {
        this.#dom.buttonClose.on("click", () => this.#onCloseButtonClick());
        this.#dom.dialog.on("close", () => this.#onClose());
    }

    #onCloseButtonClick() {
        this.#dom.dialog[0].close();
    }

    #onClose() {
        this.#sourceSelectedPromiseResolve?.();
    }

    #collectSourcesMetadata(includeOfficial = true) {
        let sourcesMetadata = [];
        for (let i = 0; i < this.#sourcePanels.length; i++) {
            if (!includeOfficial && this.#sourcePanels[i].presetsSourceMetadata.official) {
                continue;
            }
            sourcesMetadata.push(this.#sourcePanels[i].presetsSourceMetadata);
        }
        return sourcesMetadata;
    }

    #updateSourcesFromPanels() {
        this.#saveSourcesMetadataToStorage();
    }


    #readDom() {
        this.#dom.buttonAddNew = $("#presets_sources_dialog_add_new");
        this.#dom.buttonClose = $("#presets_sources_dialog_close");
        this.#dom.divSourcesPanel = $(".presets_sources_dialog_sources");
    }
}

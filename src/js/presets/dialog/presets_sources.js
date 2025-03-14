import PresetsSourceMetadata from "@/js/presets/sources/presets_source_metadata.js";
import SourcePanel from "@/js/presets/panels/source_panel.js";

export default class PresetsSourcesDialog {
    #dom = {};

    #sourcesMetadata = [];
    #sourcePanels = [];

    #repositorySelectedPromiseResolve = null;

    constructor(domDialog) {
        this.#dom.dialog = domDialog;
    }

    load() {
        return new Promise(resolve => {
            this.#dom.dialog.load("./tabs/presets/SourcesDialog/SourcesDialog.html",
            () => {
                this.#setupDialog();
                this.#initializeSources();
                resolve();
            });
        });
    }

    show() {
        this.#dom.dialog[0].showModal();
        return new Promise(resolve => this.#repositorySelectedPromiseResolve = resolve);
    }

    getActivePresetSources() {
        //return this.#activeSourcesIndexes.map(index => this.#sources[index]);
        console.log(this.#sourcesMetadata);
        return this.#sourcesMetadata.filter(source => source.active);
    }

    get isThirdPartyActive() {
        return this.getActivePresetSources().filter(source => !source.official).length > 0;
    }

    #initializeSources() {
        this.#loadSourcesMetadataFromStorage();

        for (let i = 0; i < this.#sourcesMetadata.length; i++) {
            this.#addNewSourcePanel(this.#sourcesMetadata[i], false);
        }
    }

    #loadSourcesMetadataFromStorage() {
        const self = this;
        ConfigStorage.get('PresetSourcesMetadata', function(result) {
            if (result.PresetSourcesMetadata) {
                console.log(result.PresetSourcesMetadata);
                self.#sourcesMetadata = result.PresetSourcesMetadata;
            }
        });
        this.#sourcesMetadata.unshift(this.#createOfficialSource());
        console.log(this.#sourcesMetadata);
    }

    #saveSourcesMetadataToStorage() {
        ConfigStorage.set({'PresetSourcesMetadata': this.#sourcesMetadata.filter(function(source) { if (source == null) { return false; } console.log(source); return !source.official; } )});
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

    //#addNewSourcePanel(presetSource, isActive = false, isSelected = true) {
    #addNewSourcePanel(presetsSourceMetadata, isSelected = true) {
        const sourcePanel = new SourcePanel(this.#dom.divSourcesPanel, presetsSourceMetadata);
        this.#sourcePanels.push(sourcePanel);
        return sourcePanel.load().then(() => {
            sourcePanel.setOnSelectedCallback(selectedPanel => this.#onSourcePanelSelected(selectedPanel));
            sourcePanel.setOnDeleteCallback(selectedPanel => this.#onSourcePanelDeleted(selectedPanel));
            sourcePanel.setOnActivateCallback(selectedPanel => this.#onSourcePanelActivated(selectedPanel));
            sourcePanel.setOnDeactivateCallback(selectedPanel => this.#onSourcePanelDeactivated(selectedPanel));
            sourcePanel.setOnSaveCallback(() => this.#onSourcePanelSaved());
            sourcePanel.setActive(presetsSourceMetadata.active);
            if (isSelected) {
                this.#onSourcePanelSelected(sourcePanel);
            }
        });
    }

    #setupEvents() {
        this.#dom.buttonClose.on("click", () => this.#onCloseButtonClick());
        this.#dom.dialog.on("close", () => this.#onClose());
    }

    #onCloseButtonClick() {
        this.#dom.dialog[0].close();
    }

    #onClose() {
        this.#repositorySelectedPromiseResolve?.();
    }

    #readPanels() {
        this.#sourcesMetadata = [];
        for (let i = 0; i < this.#sourcePanels.length; i++) {
            this.#sourcesMetadata.push(this.#sourcePanels[i].presetsSourceMetadata);
        }
    }

    #updateSourcesFromPanels() {
        this.#readPanels();
        this.#saveSourcesMetadataToStorage();
    }

    #onSourcePanelSaved() {
        this.#updateSourcesFromPanels();
    }

    #onSourcePanelSelected(selectedPanel) {
        for (const panel of this.#sourcePanels) {
            if (panel !== selectedPanel) {
                panel.setSelected(false);
            } else {
                panel.setSelected(true);
            }
        }
    }

    #onSourcePanelDeleted(selectedPanel) {
        this.#sourcePanels = this.#sourcePanels.filter(panel => panel !== selectedPanel);
        if (selectedPanel.active) {
            this.#sourcePanels[0].setActive(true);
        }
        this.#updateSourcesFromPanels();
    }

    #onSourcePanelActivated(selectedPanel) {
        for (const panel of this.#sourcePanels) {
            if (panel === selectedPanel) {
                panel.setActive(true);
            }
        }
        this.#updateSourcesFromPanels();
    }

    #onSourcePanelDeactivated(selectedPanel) {
        for (const panel of this.#sourcePanels) {
            if (panel === selectedPanel) {
                panel.setActive(false);
            }
        }
        this.#updateSourcesFromPanels();
    }

    #readDom() {
        this.#dom.buttonAddNew = $("#presets_sources_dialog_add_new");
        this.#dom.buttonClose = $("#presets_sources_dialog_close");
        this.#dom.divSourcesPanel = $(".presets_sources_dialog_sources");
    }
}

import PresetsSourceMetadata from "@/js/presets/sources/presets_source_metadata.js";
import SourcePanel from "@/js/presets/panels/source_panel.js";

export default class PresetsSourcesDialog {
    #dom = {};

    #sources = [];
    #sourcePanels = [];

    #repositorySelectedPromiseResolve = null;

    #activeSourcesIndexes = [0];


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
        return this.#activeSourcesIndexes.map(index => this.#sources[index]);
    }

    get isThirdPartyActive() {
        return this.getActivePresetSources().filter(source => !source.official).length > 0;
    }

    #initializeSources() {
        this.#sources = this.#readSourcesFromStorage();
        this.#activeSourcesIndexes = this.#readActiveSourceIndexesFromStorage(this.#sources.length);

        for (let i = 0; i < this.#sources.length; i++) {
            const isActive = this.#activeSourcesIndexes.includes(i);
            this.#addNewSourcePanel(this.#sources[i], isActive, false);
        }
    }

    #readSourcesFromStorage() {
        const officialSource = this.#createOfficialSource();

        let sources = null;
        ConfigStorage.get('PresetSources', function(result) {
            if (result.PresetSource) {
                sources = result.PresetSources;
            }
        });

        if (sources && sources.length > 0) {
            sources[0] = officialSource;
        } else {
            console.log("Setting sources to defaults");
            sources = [officialSource];
        }

        return sources;
    }

    #readActiveSourceIndexesFromStorage() {
        ConfigStorage.get('PresetSourcesActiveIndexes', function(result) {
            return result.PresetSourcesActiveIndexes || [0];
        });
        return [0];
    }

    #createOfficialSource() {
        const officialSource = new PresetsSourceMetadata("Rotorflight Official Presets", "https://github.com/Oats87/rotorflight-presets", "main");
        officialSource.official = true;
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

    #addNewSourcePanel(presetSource, isActive = false, isSelected = true) {
        const sourcePanel = new SourcePanel(this.#dom.divSourcesPanel, presetSource);
        this.#sourcePanels.push(sourcePanel);
        return sourcePanel.load().then(() => {
            sourcePanel.setOnSelectedCallback(selectedPanel => this.#onSourcePanelSelected(selectedPanel));
            sourcePanel.setOnDeleteCallback(selectedPanel => this.#onSourcePanelDeleted(selectedPanel));
            sourcePanel.setOnActivateCallback(selectedPanel => this.#onSourcePanelActivated(selectedPanel));
            sourcePanel.setOnDeactivateCallback(selectedPanel => this.#onSourcePanelDeactivated(selectedPanel));
            sourcePanel.setOnSaveCallback(() => this.#onSourcePanelSaved());
            sourcePanel.setActive(isActive);
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
        this.#sources = [];
        this.#activeSourcesIndexes = [];
        for (let i = 0; i < this.#sourcePanels.length; i++) {
            this.#sources.push(this.#sourcePanels[i].presetSource);
            if (this.#sourcePanels[i].active) {
                this.#activeSourcesIndexes.push(i);
            }
        }
    }

    #saveSources() {
        ConfigStorage.set({'PresetSources': this.#sources});
        ConfigStorage.set({'PresetSourcesActiveIndexes': this.#activeSourcesIndexes});
    }

    #updateSourcesFromPanels() {
        this.#readPanels();
        this.#saveSources();
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

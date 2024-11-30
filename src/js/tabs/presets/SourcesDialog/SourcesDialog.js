import PresetSource from "./PresetSource";
import SourcePanel from "./SourcePanel";

export default class PresetsSourcesDialog {
    constructor(domDialog) {
        this._domDialog = domDialog;
        this._sourceSelectedPromiseResolve = null;
        this._sourcesPanels = [];
        this._sources = [];
        this._activeSourceIndexes = [0];
    }

    load() {
        return new Promise(resolve => {
            this._domDialog.load("./tabs/presets/SourcesDialog/SourcesDialog.html",
            () => {
                this._setupDialog();
                this._initializeSources();
                resolve();
            });
        });
    }

    show() {
        this._domDialog[0].showModal();
        return new Promise(resolve => this._sourceSelectedPromiseResolve = resolve);
    }

    getActivePresetSources() {
        return this._activeSourceIndexes.map(index => this._sources[index]);
    }

    get isThirdPartyActive() {
        return this.getActivePresetSources().filter(source => !source.official).length > 0;
    }

    _initializeSources() {
        this._sources = this._readSourcesFromStorage();
        this._activeSourceIndexes = this._readActiveSourceIndexFromStorage(this._sources.length);

        for (let i = 0; i < this._sources.length; i++) {
            const isActive = this._activeSourceIndexes.includes(i);
            this._addNewSourcePanel(this._sources[i], isActive, false);
        }
    }

    _readSourcesFromStorage() {
        const officialSource = this._createOfficialSource();

        let sources = null;
        ConfigStorage.get('PresetSources', function(result) {
            if (result.PresetSource) {
                sources = result.PresetSources;
            }
        });

        if (sources && sources.length > 0) {
            sources[0] = officialSource;
        } else {
            console.log("Setting sources to defaults")
            sources = [officialSource];
        }

        return sources;
    }

    _readActiveSourceIndexFromStorage(sourcesCount) {
        ConfigStorage.get('PresetSourcesActiveIndexes', function(result) {
            return result.PresetSourcesActiveIndexes || [0];
        });
        return [0];
    }

    _createOfficialSource() {
        const officialSource = new PresetSource("Rotorflight Official Presets", "https://github.com/Oats87/rotorflight-presets", "main");
        officialSource.official = true;
        return officialSource;
    }

    _setupDialog() {
        this._readDom();
        this._setupEvents();
        this._domButtonAddNew.on("click", () => this._onAddNewSourceButtonClick());
        i18n.localizePage();
    }

    _onAddNewSourceButtonClick() {
        const presetSource = new PresetSource(i18n.getMessage("presetsSourcesDialogDefaultSourceName"), "", "");
        this._addNewSourcePanel(presetSource).then(() => {
            this._scrollDown();
            this._updateSourcesFromPanels();
        });
    }

    _scrollDown() {
        this._domDivSourcesPanel.stop();
        this._domDivSourcesPanel.animate({scrollTop: `${this._domDivSourcesPanel.prop('scrollHeight')}px`});
    }

    _addNewSourcePanel(presetSource, isActive = false, isSelected = true) {
        const sourcePanel = new SourcePanel(this._domDivSourcesPanel, presetSource);
        this._sourcesPanels.push(sourcePanel);
        return sourcePanel.load().then(() => {
            sourcePanel.setOnSelectedCallback(selectedPanel => this._onSourcePanelSelected(selectedPanel));
            sourcePanel.setOnDeleteCallback(selectedPanel => this._onSourcePanelDeleted(selectedPanel));
            sourcePanel.setOnActivateCallback(selectedPanel => this._onSourcePanelActivated(selectedPanel));
            sourcePanel.setOnDeactivateCallback(selectedPanel => this._onSourcePanelDeactivated(selectedPanel));
            sourcePanel.setOnSaveCallback(() => this._onSourcePanelSaved());
            sourcePanel.setActive(isActive);
            if (isSelected) {
                this._onSourcePanelSelected(sourcePanel);
            }
        });
    }

    _setupEvents() {
        this._domButtonClose.on("click", () => this._onCloseButtonClick());
        this._domDialog.on("close", () => this._onClose());
    }

    _onCloseButtonClick() {
        this._domDialog[0].close();
    }

    _onClose() {
        this._sourceSelectedPromiseResolve?.();
    }

    _readPanels() {
        this._sources = [];
        this._activeSourceIndexes = [];
        for (let i = 0; i < this._sourcesPanels.length; i++) {
            this._sources.push(this._sourcesPanels[i].presetSource);
            if (this._sourcesPanels[i].active) {
                this._activeSourceIndexes.push(i);
            }
        }
    }

    _saveSources() {
        ConfigStorage.set({'PresetSources': this._sources});
        ConfigStorage.set({'PresetSourcesActiveIndexes': this._activeSourceIndexes});
    }

    _updateSourcesFromPanels() {
        this._readPanels();
        this._saveSources();
    }

    _onSourcePanelSaved() {
        this._updateSourcesFromPanels();
    }

    _onSourcePanelSelected(selectedPanel) {
        for (const panel of this._sourcesPanels) {
            if (panel !== selectedPanel) {
                panel.setSelected(false);
            } else {
                panel.setSelected(true);
            }
        }
    }

    _onSourcePanelDeleted(selectedPanel) {
        this._sourcesPanels = this._sourcesPanels.filter(panel => panel !== selectedPanel);
        if (selectedPanel.active) {
            this._sourcesPanels[0].setActive(true);
        }
        this._updateSourcesFromPanels();
    }

    _onSourcePanelActivated(selectedPanel) {
        for (const panel of this._sourcesPanels) {
            if (panel === selectedPanel) {
                panel.setActive(true);
            }
        }
        this._updateSourcesFromPanels();
    }

    _onSourcePanelDeactivated(selectedPanel) {
        for (const panel of this._sourcesPanels) {
            if (panel === selectedPanel) {
                panel.setActive(false);
            }
        }
        this._updateSourcesFromPanels();
    }

    _readDom() {
        this._domButtonAddNew = $("#presets_sources_dialog_add_new");
        this._domButtonClose = $("#presets_sources_dialog_close");
        this._domDivSourcesPanel = $(".presets_sources_dialog_sources");
    }
}

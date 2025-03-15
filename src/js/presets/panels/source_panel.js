import PresetsSourceGithubUtil from "@/js/presets/sources/presets_source_util.js";
import IndexedPresetsSource from "@/js/presets/sources/indexed_presets_source.js";

export default class SourcePanel {
    
    #metadata;
    #metadataEdited = false;

    #presetsIndex = null;

    #dom = {
        divWrapper: null,

        divInnerPanel: null,
        divNoEditing: null,
        divEditing: null,

        editName: null,
        editUrl: null,
        editGitHubBranch: null,

        buttonSave: null,
        buttonReset: null,
        buttonActivate: null,
        buttonDeactivate: null,
        buttonDelete: null,
        divGithubBranch: null,
        divNoEditingName: null,

        divSelectedIndicator: null,
    };
    #callbacks = {
        sourceChanged: null,
    };
    #domId = "";
    #selected = null;

    #parentDiv;

    constructor(parentDiv, presetSourceMetadata) {
        this.#parentDiv = parentDiv;
        this.#metadata = presetSourceMetadata;
    }

    get presetsSourceMetadata() {
        return this.#metadata;
    }

    load() {
        return new Promise(() => {
            console.log("loading source panel");
        SourcePanel.s_panelCounter++;
        this.#domId = `source_panel_${SourcePanel.s_panelCounter}`;
        console.log("adding for dom ID: " + this.#domId);
        this.#parentDiv.append(`<div id="${this.#domId}"></div>`);
        this.#dom.divWrapper = $(`#${this.#domId}`);
        this.#dom.divWrapper.toggle(false);
        }).then(this.#dom.divWrapper.load("./tabs/presets/SourcesDialog/SourcePanel.html")).then(() => { this.#setupHtml(); });
    }

    #loadIndex() {
        let rawUrl = this.#metadata.url;
        console.log("loading index");
        let viewUrl = this.#metadata.url;
        console.log("rawURL: "+rawUrl+" viewURL: "+viewUrl);
        if (PresetsSourceGithubUtil.isUrlGithubRepo(this.#metadata.url)) {
            ({rawUrl, viewUrl} = PresetsSourceGithubUtil.getUrlsForGithub(this.#metadata.url, this.#metadata.branch));
        }
        console.log("rawURL: "+rawUrl+" viewURL: "+viewUrl);

        this.#presetsIndex = new IndexedPresetsSource(rawUrl, viewUrl);
    }

    get indexedPresetsSource() {
        return this.#presetsIndex;
    }

    set sourceChangedCallback(sourceChangedCallback) {
        this.#callbacks.sourceChanged = sourceChangedCallback;
    }

    set selected(isSelected) {
        if (this.#selected !== isSelected) {
            this.#dom.divNoEditing.toggle(!isSelected);
            this.#dom.divEditing.toggle(isSelected);

            this._onResetButtonClick();
            this.#dom.divNoEditingName.text(this.#metadata.name);

            this.#dom.divInnerPanel.toggleClass("presets_source_panel_not_selected", !isSelected);
            this.#dom.divInnerPanel.toggleClass("presets_source_panel_selected", isSelected);
            if (isSelected) {
                this.#dom.divInnerPanel.off("click");
            } else {
                this.#dom.divInnerPanel.on("click", () => this.#onPanelSelected());
            }

            this.#selected = isSelected;
        }
    }

    set metadataEdited(edited) {
        this.#metadataEdited = edited;
        if (this.#metadataEdited) {
            this.#dom.buttonSave.removeClass(GUI.buttonDisabledClass);
            this.#dom.buttonReset.removeClass(GUI.buttonDisabledClass);
        } else {
            this.#dom.buttonSave.addClass(GUI.buttonDisabledClass);
            this.#dom.buttonReset.addClass(GUI.buttonDisabledClass);
        }
    }

    set active(active) {
        this.#metadata.active = active;
        this.#dom.divSelectedIndicator.toggle(active);
        this.#dom.buttonActivate.toggle(!active);
        this.#dom.buttonDeactivate.toggle(active);
        if (active) {
            this.#loadIndex();
        }
    }


    #setupHtml() {
        console.log("setting up html");
        this.#readDom();
        this.#setupActions();
        this.selected = false;
        this.metadataEdited = false;
        this._checkIfGithub();
        this.active = this.#metadata.active;

        if (this.#metadata.official){
            this.active = true;
            console.log("Official source activated");
            this.#dom.buttonSave.toggle(false);
            this.#dom.buttonReset.toggle(false);
            this.#dom.buttonDelete.toggle(false);
            this.#dom.buttonActivate.toggle(false);
            this.#dom.buttonDeactivate.toggle(false);
            this.#dom.editName.prop("disabled", true);
            this.#dom.editUrl.prop("disabled", true);
            this.#dom.editGitHubBranch.prop("disabled", true);
        }

        i18n.localizePage();
        this.#dom.divWrapper.toggle(true);
    }

    #setupActions() {
        this.#dom.buttonSave.on("click", () => this._onSaveButtonClick());
        this.#dom.buttonReset.on("click", () => this._onResetButtonClick());
        this.#dom.buttonDelete.on("click", () => this._onDeleteButtonClick());
        this.#dom.buttonActivate.on("click", () => this._onActivateButtonClick());
        this.#dom.buttonDeactivate.on("click", () => this._onDeactivateButtonClick());

        this.#dom.editName.on("input", () => this._onInputChange());
        this.#dom.editUrl.on("input", () => this._onInputChange());
        this.#dom.editGitHubBranch.on("input", () => this._onInputChange());
    }

    #onPanelSelected() {
        this.selected = true;
        this.#callbacks.onSelected?.(this);
    }

    _checkIfGithub() {
        console.log("editURL: " + this.#dom.editUrl.val());
        const isGithubUrl = PresetsSourceGithubUtil.isUrlGithubRepo(this.#dom.editUrl.val());
        this.#dom.divGithubBranch.toggle(isGithubUrl);
    }

    _onInputChange() {
        this._checkIfGithub();
        if (PresetsSourceGithubUtil.containsBranchName(this.#dom.editUrl.val())) {
            this.#dom.editGitHubBranch.val(PresetsSourceGithubUtil.getBranchName(this.#dom.editUrl.val()));
            this.#dom.editUrl.val(this.#dom.editUrl.val().split("/tree/")[0]);
        }
        this.metadataEdited = false;
    }

    _onSaveButtonClick() {
        this.#metadata.name = this.#dom.editName.val();
        this.#metadata.url = this.#dom.editUrl.val();
        this.#metadata.branch = this.#dom.editGitHubBranch.val();
        this.metadataEdited = false;
        this.#callbacks.onSave?.(this);
    }


    _onResetButtonClick() {
        this.#dom.editName.val(this.#metadata.name);
        this.#dom.editUrl.val(this.#metadata.url);
        this.#dom.editGitHubBranch.val(this.#metadata.branch);
        this._checkIfGithub();
        this.metadataEdited = false;
    }

    _onDeleteButtonClick() {
        this.#dom.divWrapper.remove();
        this.#callbacks.sourceChanged?.(this);
    }

    _onActivateButtonClick() {
        this._onSaveButtonClick();
        this.active = true;
        this.#callbacks.sourceChanged?.(this);
    }

    _onDeactivateButtonClick() {
        this._onSaveButtonClick();
        this.active = false;
        this.#callbacks.sourceChanged?.(this);
    }

    #readDom() {
        this.#dom.divInnerPanel = this.#dom.divWrapper.find(".presets_source_panel");
        this.#dom.divNoEditing = this.#dom.divWrapper.find(".presets_source_panel_no_editing");
        this.#dom.divEditing = this.#dom.divWrapper.find(".presets_source_panel_editing");

        this.#dom.editName = this.#dom.divWrapper.find(".presets_source_panel_editing_name_field");
        this.#dom.editUrl = this.#dom.divWrapper.find(".presets_source_panel_editing_url_field");
        this.#dom.editGitHubBranch = this.#dom.divWrapper.find(".presets_source_panel_editing_branch_field");

        this.#dom.buttonSave = this.#dom.divWrapper.find(".presets_source_panel_save");
        this.#dom.buttonReset = this.#dom.divWrapper.find(".presets_source_panel_reset");
        this.#dom.buttonActivate = this.#dom.divWrapper.find(".presets_source_panel_activate");
        this.#dom.buttonDeactivate = this.#dom.divWrapper.find(".presets_source_panel_deactivate");
        this.#dom.buttonDelete = this.#dom.divWrapper.find(".presets_source_panel_delete");
        this.#dom.divGithubBranch = this.#dom.divWrapper.find(".presets_source_panel_editing_github_branch");
        this.#dom.divNoEditingName = this.#dom.divWrapper.find(".presets_source_panel_no_editing_name");

        this.#dom.divSelectedIndicator = this.#dom.divWrapper.find(".presets_source_panel_no_editing_selected");
    }
}

SourcePanel.s_panelCounter = 0;

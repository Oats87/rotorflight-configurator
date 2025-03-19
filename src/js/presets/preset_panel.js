import PresetInstance from "@/js/presets/source/preset_instance.js";

/**
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 * @typedef {import("@/js/presets/source/source.js").Source} Source
 * @typedef {import("@/js/presets/preset_dialog.js").default} PresetsDialog
 */

export default class PresetPanel
{
    /**
     * @type {Source}
     */
    #presetSource;

    /**
     * @type {PresetData}
     */
    #presetData;

    /**
     * @type {string}
     */
    #domId;

    #dom = {
        /**
         * @type {HTMLDivElement}
         */
        parentDiv: null,

        /**
         * @type {HTMLDivElement}
         */
        divWrapper: null,

        /**
         * @type {HTMLSpanElement}
         */
        title: null,
        /**
         * @type {HTMLSpanElement}
         */
        star: null,
        /**
         * @type {HTMLSpanElement}
         */
        category: null,
        /**
         * @type {HTMLSpanElement}
         */
        author: null,
        /**
         * @type {HTMLSpanElement}
         */
        keywords: null,
        /**
         * @type {HTMLSpanElement}
         */
        sourceRepository: null,
        
        /**
         * @type {HTMLTableRowElement}
         */
        sourceRepositoryRow: null,

        /**
         * @type {HTMLSpanElement}
         */
        versions: null,
        /**
         * @type {HTMLSpanElement}
         */
        statusOfficial: null,
        /**
         * @type {HTMLSpanElement}
         */
        statusCommunity: null,
        /**
         * @type {HTMLSpanElement}
         */
        statusExperimental: null,
        /**
         * @type {HTMLSpanElement}
         */
        officialSourceIcon: null,
    };

    #callbacks = {
        /**
         * @type {Function}
         */
        onLoaded: null
    };

    /**
     * @type {boolean} 
     */
    #showSourceName;
    /**
     * @type {boolean} 
     */
    #clickable;

    /**
     * @type {boolean} 
     */
    #starClicked;

    /**
     * @type {boolean} 
     */
    #mouseOnStar;

    /**
     * @type {boolean} 
     */
    #mouseOnPanel;

    /**
     * @type {boolean} 
     */
    #presetSelectedForApply;

    /**
     * 
     * @param {HTMLDivElement} parentDiv 
     * @param {PresetData} preset 
     * @param {Source} source 
     * @param {boolean} clickable 
     * @param {boolean} showSourceName 
     * @param {Function} onLoadedCallback 
     * @param {any[]} favoritePresets 
     */
    constructor(parentDiv, preset, source, clickable, showSourceName, presetSelectedForApply, onLoadedCallback, favoritePresets)
    {
        PresetPanel.s_panelCounter ++;
        this.#dom.parentDiv = parentDiv;
        this.#callbacks.onLoaded = onLoadedCallback;
        this.#domId = `preset_title_panel_${PresetPanel.s_panelCounter}`;
        this.#presetData = preset;
        this.#presetSource = source;
        this.#showSourceName = showSourceName;
        this.#clickable = clickable;
        this._favoritePresets = favoritePresets;
        this.#presetSelectedForApply = presetSelectedForApply;

        this.#dom.parentDiv.append(`<div class="${this.#domId}"></div>`);
        this.#dom.divWrapper = $(`.${this.#domId}`);
        this.#dom.divWrapper.toggle(false);
        this.#starClicked = false;
        this.#mouseOnStar = false;
        this.#mouseOnPanel = false;
        this.#clickable = clickable;

        if (clickable) {
            this.#dom.divWrapper.addClass("preset_title_panel_border");
            // setting up hover effect here, because if setup in SCC it stops working after background animation like - this._domWrapperDiv.animate({ backgroundColor....
        }
    }

    #updateHoverEffects() {
        let starMouseHover = false;

        if (this.#clickable && this.#mouseOnPanel && !this.#mouseOnStar) {
            this.#dom.divWrapper.css({"background-color": "var(--darkAccent)"});
        } else {
            this.#dom.divWrapper.css({"background-color": "var(--backgroundColor)"});
        }

        if (this.#mouseOnStar || (this.#mouseOnPanel && this.#clickable)) {
            this.#dom.star.css({"background-color": "var(--darkAccent)"});
            starMouseHover = true;
        } else {
            this.#dom.divWrapper.css({"background-color": "var(--backgroundColor)"});
            this.#dom.star.css({"background-color": "var(--backgroundColor)"});
        }

        if (this.#presetData.lastPickDate) {
            this.#dom.star.css("background-image", "url('../../../images/icons/star_orange.svg')");
        } else if (starMouseHover) {
            this.#dom.star.css("background-image", "url('../../../images/icons/star_orange_stroke.svg')");
        } else {
            this.#dom.star.css("background-image", "url('../../../images/icons/star_transparent.svg')");
        }
    }

    load() {
        this.#dom.divWrapper.load("./tabs/presets/preset_panel.html", () => this.#setupHtml());
    }

    /**
     * 
     * @param {PresetsDialog} presetDialog
     */
    subscribeClick(presetDialog, presetInstances) {
        this.#dom.divWrapper.on("click", () => {
            if (!this.#starClicked) {
                this.#showPresetDetails(presetDialog, presetInstances);
            }

            this.#starClicked = false;
        });
    }

    /**
     * 
     * @param {PresetsDialog} presetDialog 
     * @param {PresetInstance[]} presetInstances
     */
    #showPresetDetails(presetDialog, presetInstances) {
        let presetInstance = null;
        let presetInstanceExists = false;
        presetInstances.forEach(pi => {
            if (pi.presetData.hash === this.#presetData.hash) {
                presetInstance = pi;
                presetInstanceExists = true;
            }
        });
        if (presetInstance === null) {
            presetInstance = new PresetInstance(this.#presetSource.metadata, this.#presetData);
        }

        presetDialog.showPreset(this.#presetSource, presetInstance, this.#showSourceName).then(isPresetPicked => {
            if (isPresetPicked) {
                this.setPicked(true);
                if (!presetInstanceExists) {
                    presetInstances.push(presetInstance);
                }
            }
            this.#updateHoverEffects();
        });
    }

    setPicked(isPicked) {
        if (!this.#clickable) {
            return;
        }

        if (isPicked) {
            this.#dom.divWrapper.css({"border": "2px solid green"});
        } else {
            this.#dom.divWrapper.css({"border": "1px solid var(--subtleAccent)"});
        }
    }

    #setupHtml()
    {
        this.#readDom();

        this.#dom.category.text(this.#presetData.category);
        this.#dom.title.text(this.#presetData.title);
        this.#dom.title.prop("title", this.#presetData.title);
        this.#dom.author.text(this.#presetData.author);
        this.#dom.versions.text(this.#presetData.firmware_version?.join("; "));
        this.#dom.sourceRepository.text(this.#presetSource.metadata.name);
        this.#dom.sourceRepositoryRow.toggle(this.#showSourceName);

        this.#dom.keywords.text(this.#presetData.keywords?.join("; "));
        this.#dom.keywords.prop("title", this.#presetData.keywords?.join("; "));
        this.#dom.statusOfficial.toggle(this.#presetData.status === "OFFICIAL");
        this.#dom.statusCommunity.toggle(this.#presetData.status === "COMMUNITY");
        this.#dom.statusExperimental.toggle(this.#presetData.status === "EXPERIMENTAL");
        this.#dom.officialSourceIcon.toggle(this.#presetSource.metadata.official);

        this.setPicked(this.#presetSelectedForApply);

        this.#setupStar();

        this.#dom.divWrapper.on("mouseenter", () => { this.#mouseOnPanel = true; this.#updateHoverEffects(); });
        this.#dom.divWrapper.on("mouseleave", () => { this.#mouseOnPanel = false; this.#updateHoverEffects(); } );
        this.#dom.star.on("mouseenter", () => { this.#mouseOnStar = true; this.#updateHoverEffects(); });
        this.#dom.star.on("mouseleave", () => { this.#mouseOnStar = false; this.#updateHoverEffects(); });

        i18n.localizePage();
        this.#dom.divWrapper.toggle(true);

        if (typeof this.#callbacks.onLoaded === 'function') {
            this.#callbacks.onLoaded();
        }
    }

    #readDom()
    {
        this.#dom.title = this.#dom.divWrapper.find('.preset_title_panel_title');
        this.#dom.star = this.#dom.divWrapper.find('.preset_title_panel_star');
        this.#dom.category = this.#dom.divWrapper.find('.preset_title_panel_category');
        this.#dom.author = this.#dom.divWrapper.find('.preset_title_panel_author_text');
        this.#dom.keywords = this.#dom.divWrapper.find('.preset_title_panel_keywords_text');
        this.#dom.sourceRepository = this.#dom.divWrapper.find('.preset_title_panel_repository_text');
        this.#dom.sourceRepositoryRow = this.#dom.divWrapper.find('.preset_title_panel_repository_row');
        this.#dom.versions = this.#dom.divWrapper.find('.preset_title_panel_versions_text');
        this.#dom.statusOfficial = this.#dom.divWrapper.find('.preset_title_panel_status_official');
        this.#dom.statusCommunity = this.#dom.divWrapper.find('.preset_title_panel_status_community');
        this.#dom.statusExperimental = this.#dom.divWrapper.find('.preset_title_panel_status_experimental');
        this.#dom.officialSourceIcon = this.#dom.divWrapper.find('.preset_title_panel_betaflight_official');
    }

    #setupStar() {
        this.#updateHoverEffects();

        this.#dom.star.on("click", () => {
            this.#starClicked = true;
            this.#processStarClick();
        });
    }

    #processStarClick() {
        if (this.#presetData.lastPickDate) {
            this._favoritePresets.delete(this.#presetData, this.#presetSource);
        } else {
            this._favoritePresets.add(this.#presetData, this.#presetSource);
        }

        this._favoritePresets.saveToStorage();
        this.#updateHoverEffects();
    }

    remove()
    {
        this.#dom.divWrapper.remove();
    }
}

PresetPanel.s_panelCounter = 0;

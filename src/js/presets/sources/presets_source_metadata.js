export default class PresetsSourceMetadata {
    #name = "New Source";
    #url = "";
    #branch = "";
    #official = false;
    #active = false;


    constructor(name, url, branch = "") {
        this.#name = name;
        this.#url = url;
        this.#branch = branch;
    }

    get official() {
        return this.#official;
    }

    set official(value) {
        this.#official = value;
    }

    get active() {
        return this.#active;
    }

    set active(value) {
        this.#active = value;
    }

    get branch() {
        return this.#branch;
    }

    get name() {
        return this.#name;
    }

    get url() {
        return this.#url;
    }
}
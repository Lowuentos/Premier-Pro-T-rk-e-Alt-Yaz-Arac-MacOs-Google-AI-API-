/**
 * Lightweight CSInterface implementation for Adobe CEP panels.
 * Provides the essential bridge between the panel's browser context and ExtendScript.
 */
(function () {
    'use strict';

    function CSInterface() {}

    /**
     * Evaluates an ExtendScript script.
     * 
     * @param {string} script The ExtendScript code to evaluate.
     * @param {function} callback Optional callback function to receive the execution result.
     */
    CSInterface.prototype.evalScript = function (script, callback) {
        if (typeof window !== 'undefined' && window.__adobe_cep__) {
            if (callback === null || callback === undefined) {
                window.__adobe_cep__.evalScript(script);
            } else {
                window.__adobe_cep__.evalScript(script, callback);
            }
        } else {
            console.error("Adobe CEP (__adobe_cep__) is not available in this environment.");
            if (callback) {
                callback("error: __adobe_cep__ not available");
            }
        }
    };

    // Attach to global window scope
    if (typeof window !== 'undefined') {
        window.CSInterface = CSInterface;
    }
})();
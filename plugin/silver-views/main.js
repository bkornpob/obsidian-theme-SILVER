'use strict';

/*
	SILVER Views — per-view persistent background presets.

	Companion plugin for the SILVER theme. Stores one preset per
	workspace leaf id (stable across file swaps, splits, drags, and
	restarts — ids are serialized in workspace.json). Applies a class
	plus one CSS variable to the leaf container; the theme does the
	painting. Main display zone only; sidebars keep the global look.

	Plain CommonJS, no build step. API surface used:
	Plugin.loadData/saveData, Workspace.iterateAllLeaves/onLayoutReady,
	workspace events layout-change / active-leaf-change / window-open,
	View.onPaneMenu (wrapped), SuggestModal, Notice, addCommand.
	leaf.id and leaf.tabHeaderEl are runtime properties (with a DOM
	fallback for the tab header).
*/

const { Plugin, SuggestModal, Notice, View } = require('obsidian');

const PRESETS = [
	{ key: 'default', label: 'Default (SILVER image background)', hue: null },
	{ key: 'neon-violet', label: 'Neon violet', hue: '#b366ff' },
	{ key: 'neon-blue', label: 'Neon blue', hue: '#4da6ff' },
	{ key: 'neon-green', label: 'Neon green', hue: '#3dff9e' },
	{ key: 'neon-yellow', label: 'Neon yellow', hue: '#ffd93d' },
	{ key: 'neon-red', label: 'Neon red', hue: '#ff4d4d' },
	{ key: 'silver-primary', label: 'Silver primary (amber)', hue: '#fa9c1c' },
	{ key: 'silver-secondary', label: 'Silver secondary (mint)', hue: '#33d3ad' },
];

const PRESET_BY_KEY = {};
for (const p of PRESETS) PRESET_BY_KEY[p.key] = p;

class BackgroundPicker extends SuggestModal {
	constructor(plugin, leaf) {
		super(plugin.app);
		this.plugin = plugin;
		this.leaf = leaf;
		this.setPlaceholder('Choose a background for this view…');
	}

	getSuggestions(query) {
		const q = query.trim().toLowerCase();
		if (!q) return PRESETS;
		return PRESETS.filter(
			(p) => p.label.toLowerCase().includes(q) || p.key.includes(q)
		);
	}

	renderSuggestion(preset, el) {
		el.addClass('silver-view-suggestion');
		const swatch = el.createDiv({ cls: 'silver-view-swatch' });
		if (preset.hue) swatch.style.backgroundColor = preset.hue;
		else swatch.addClass('silver-view-swatch-default');
		el.createDiv({ cls: 'silver-view-suggestion-label', text: preset.label });
		const current = this.plugin.settings.leaves[this.leaf.id] || 'default';
		if (current === preset.key) {
			el.createDiv({ cls: 'silver-view-suggestion-current', text: 'current' });
		}
	}

	onChooseSuggestion(preset) {
		this.plugin.setLeafPreset(this.leaf, preset.key);
	}
}

module.exports = class SilverViewsPlugin extends Plugin {
	async onload() {
		this.settings = Object.assign({ version: 1, leaves: {} }, await this.loadData());

		this.app.workspace.onLayoutReady(() => this.applyAll());
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.applyAll();
				this.prune();
			})
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.applyAll())
		);
		this.registerEvent(
			this.app.workspace.on('window-open', () => this.applyAll())
		);
		// File swaps rebuild the view inside the leaf without firing
		// layout-change or active-leaf-change — re-apply here, with a
		// delayed second pass in case the DOM rebuild is asynchronous.
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.applyAll();
				clearTimeout(this._fileOpenTimer);
				this._fileOpenTimer = setTimeout(() => this.applyAll(), 200);
			})
		);
		this.register(() => clearTimeout(this._fileOpenTimer));

		this.addCommand({
			id: 'set-view-background',
			name: 'Set background for active view',
			callback: () => this.openPicker(this.app.workspace.activeLeaf),
		});
		this.addCommand({
			id: 'reset-all-view-backgrounds',
			name: 'Reset all view backgrounds',
			callback: () => this.resetAll(),
		});

		// Extend every view's pane menu through the official onPaneMenu
		// hook (there is no workspace 'pane-menu' event in the API).
		const plugin = this;
		const orig = View.prototype.onPaneMenu;
		View.prototype.onPaneMenu = function (menu, source) {
			if (orig) orig.call(this, menu, source);
			if (this.leaf && plugin.isRootLeaf(this.leaf)) {
				menu.addSeparator();
				menu.addItem((item) =>
					item
						.setTitle('Set view background…')
						.setIcon('palette')
						.onClick(() => plugin.openPicker(this.leaf))
				);
			}
		};
		this.register(() => {
			View.prototype.onPaneMenu = orig;
		});
	}

	onunload() {
		this.app.workspace.iterateAllLeaves((leaf) => this.clearLeaf(leaf));
	}

	isRootLeaf(leaf) {
		const el = leaf && leaf.containerEl;
		return !!el && !!el.closest('.workspace-split.mod-root');
	}

	getTabHeaderEl(leaf) {
		if (leaf.tabHeaderEl) return leaf.tabHeaderEl;
		const el = leaf.containerEl;
		const tabs = el && el.closest('.workspace-tabs');
		if (!tabs) return null;
		const container = tabs.querySelector('.workspace-tab-container');
		const headers = tabs.querySelector('.workspace-tab-header-container');
		if (!container || !headers) return null;
		const idx = Array.prototype.indexOf.call(container.children, el);
		return headers.querySelectorAll('.workspace-tab-header')[idx] || null;
	}

	applyLeaf(leaf) {
		const el = leaf.containerEl;
		if (!el || !el.isConnected) return;
		const preset = PRESET_BY_KEY[this.settings.leaves[leaf.id]];
		const on = this.isRootLeaf(leaf) && !!preset && !!preset.hue;
		el.classList.toggle('silver-view-tinted', on);
		if (on) el.style.setProperty('--silver-view-hue', preset.hue);
		else el.style.removeProperty('--silver-view-hue');
		const tab = this.getTabHeaderEl(leaf);
		if (tab) {
			tab.classList.toggle('silver-view-tab-tinted', on);
			if (on) tab.style.setProperty('--silver-view-hue', preset.hue);
			else tab.style.removeProperty('--silver-view-hue');
		}
	}

	clearLeaf(leaf) {
		const el = leaf.containerEl;
		if (el) {
			el.classList.remove('silver-view-tinted');
			el.style.removeProperty('--silver-view-hue');
		}
		const tab = this.getTabHeaderEl(leaf);
		if (tab) {
			tab.classList.remove('silver-view-tab-tinted');
			tab.style.removeProperty('--silver-view-hue');
		}
	}

	applyAll() {
		this.app.workspace.iterateAllLeaves((leaf) => this.applyLeaf(leaf));
	}

	prune() {
		const live = new Set();
		this.app.workspace.iterateAllLeaves((leaf) => live.add(leaf.id));
		let changed = false;
		for (const id of Object.keys(this.settings.leaves)) {
			if (!live.has(id)) {
				delete this.settings.leaves[id];
				changed = true;
			}
		}
		if (changed) this.saveData(this.settings);
	}

	openPicker(leaf) {
		if (!leaf) return;
		if (!this.isRootLeaf(leaf)) {
			new Notice('SILVER Views: only main-zone views can be customized.');
			return;
		}
		new BackgroundPicker(this, leaf).open();
	}

	async setLeafPreset(leaf, key) {
		if (!this.isRootLeaf(leaf)) {
			new Notice('SILVER Views: only main-zone views can be customized.');
			return;
		}
		if (key === 'default') delete this.settings.leaves[leaf.id];
		else this.settings.leaves[leaf.id] = key;
		await this.saveData(this.settings);
		this.applyLeaf(leaf);
		const preset = PRESET_BY_KEY[key];
		new Notice('SILVER Views: ' + (preset ? preset.label : key));
	}

	async resetAll() {
		this.settings.leaves = {};
		await this.saveData(this.settings);
		this.applyAll();
		new Notice('SILVER Views: all view backgrounds reset.');
	}
};

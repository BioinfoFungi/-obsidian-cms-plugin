import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import axios from "axios"
import objectPath from 'object-path'
// Remember to rename these classes and interfaces!

interface ImageUploaderSettings {
	url: string;
	authorizeSDK: string;
	// uploadPreset: string;
	// folder: string;
}
// Set settings defaults
const DEFAULT_SETTINGS: ImageUploaderSettings = {
	url: "http://localhost:8080",
	authorizeSDK: null,
	// uploadPreset: "aaa",
	// folder: "aaa",
	//maxWidth: 4096, TODO
	//enableResize: false, TODO later
  };



export default class MyPlugin extends Plugin {
	settings: ImageUploaderSettings;

	private replaceText(editor: Editor, target: string, replacement: string): void {
		target = target.trim();
		let lines = [];
		for (let i = 0; i < editor.lineCount(); i++){
		  lines.push(editor.getLine(i));
		}
		//const tlines = editor.getValue().split("\n");
		for (let i = 0; i < lines.length; i++) {
		  const ch = lines[i].indexOf(target)
		  if (ch !== -1) {
			const from = { line: i, ch };
			const to = { line: i, ch: ch + target.length };
			editor.replaceRange(replacement, from, to);
			break;
		  }
		}
	}

	setupPasteHandler(): void {
		// On paste event, get "files" from clipbaord data
		// If files contain image, move to API call
		// if Files empty or does not contain image, throw error
		this.registerEvent(this.app.workspace.on('editor-paste',async (evt: ClipboardEvent, editor: Editor)=>{
			const { files } = evt.clipboardData;
			// console.log("aaaaaaaaaaaa")
			if(files.length > 0){
				if (this.settings.url && this.settings.authorizeSDK && files[0].type.startsWith("image")) {
					evt.preventDefault(); // Prevent default paste behaviour
				
					for (let file of files) {
						const randomString = (Math.random() * 10086).toString(36).substr(0, 8)
						const pastePlaceText = `![uploading...](${randomString})\n`
						editor.replaceSelection(pastePlaceText) // Generate random string to show on editor screen while API call completes
						// console.log(pastePlaceText)
						// // Cloudinary request format
						// // Send form data with a file and upload preset
						// // Optionally define a folder
						const formData = new FormData();
						formData.append('file',file);
						// formData.append('upload_preset',this.settings.uploadPreset);
						// formData.append('folder',this.settings.folder);
			
						// // Make API call
						axios({
							url: `${this.settings.url}/api/attachment/upload`,
							method: 'POST',
							data: formData,
							headers:{'authorizeSDK':this.settings.authorizeSDK}
						}).then(res => {
							// Get response public URL of uploaded image
							console.log(res.data.data.path);
							// const url = objectPath.get(res.data, 'secure_url')
							const url = res.data.data.path;
							const imgMarkdownText = `![](${url})`
							// Show MD syntax using uploaded image URL, in Obsidian Editor
							this.replaceText(editor, pastePlaceText, imgMarkdownText)
						}, err => {
							// Fail otherwise
							new Notice(err, 5000)
							console.log(err)
						})
					}
				}
			// else {
			// // If not image data, or empty files array
			//   new Notice("Cloudinary Image Uploader: Please check the image hosting settings.");
			//   editor.replaceSelection("Please check settings for upload\n This will also appear if file is not of image type");
			// } 
	  
			}
		}))
	}
	async onload() {
		console.log("loading bioinfo Uploader");
		await this.loadSettings();
		this.setupPasteHandler();
		// const uploadBody = this.settings.mySetting
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice("---------");
		});
		
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for bioinfo plugin.' });

		new Setting(containerEl)
			.setName('url')
			.setDesc('url ')
			.addText(text => text
				.setPlaceholder('Enter your url')
				.setValue(this.plugin.settings.url)
				.onChange(async (value) => {
					console.log('url: ' + value);
					this.plugin.settings.url = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('authorizeSDK')
			.setDesc('authorizeSDK ')
			.addText(text => text
				.setPlaceholder('Enter your authorizeSDK')
				.setValue(this.plugin.settings.authorizeSDK)
				.onChange(async (value) => {
					console.log('authorizeSDK: ' + value);
					this.plugin.settings.authorizeSDK = value;
					await this.plugin.saveSettings();
				}));
	}
}

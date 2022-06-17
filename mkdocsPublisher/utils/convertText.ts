import {MkdocsPublicationSettings} from "../settings/interface";
import {MetadataCache, TFile} from "obsidian";
import {getReceiptFolder, createRelativePath, getImageLinkOptions} from "./filePathConvertor";

function convertWikilinks(fileContent: string, settings: MkdocsPublicationSettings, linkedFiles: {linked: TFile, linkFrom: string, altText: string}[]) {
	if (!settings.convertWikiLinks) {
		return fileContent;
	}
	const wikiRegex = /\[\[.*?\]\]/g;
	const wikiMatches = fileContent.match(wikiRegex);
	if (wikiMatches) {
		const fileRegex = /(?<=\[\[).*?(?=([\]|]))/;
		for (const wikiMatch of wikiMatches) {
			const fileMatch = wikiMatch.match(fileRegex);
			if (fileMatch) {
				const fileName = fileMatch[0];
				const linkedFile=linkedFiles.find(item => item.linkFrom===fileName);
				if (linkedFile) {
					const altText = linkedFile.altText.length > 0 ? linkedFile.altText : linkedFile.linked.extension === 'md' ? linkedFile.linked.basename : "";
					const linkCreator = `[${altText}](${encodeURI(linkedFile.linkFrom)})`;
					fileContent = fileContent.replace(wikiMatch, linkCreator);
				} else if (!fileName.startsWith('http')) {
					const altMatch = wikiMatch.match(/(?<=\|).*(?=]])/);
					const altCreator = fileName.split('/');
					const altLink = creatorAltLink(altMatch, altCreator, fileName.split('.').at(-1));
					const linkCreator = `[${altLink}](${encodeURI(fileName.trim())})`;
					fileContent = fileContent.replace(wikiMatch, linkCreator);
				}
			}
		}
	}
	return fileContent;
}

function convertLinkCitation(fileContent: string, settings: MkdocsPublicationSettings, linkedFiles : {linked: TFile, linkFrom: string, altText: string}[], metadataCache: MetadataCache, sourceFile: TFile) {
	if (!settings.convertForGithub) {
		return fileContent;
	}
	for (const linkedFile of linkedFiles) {
		let pathInGithub=linkedFile.linked.extension === 'md' ? getReceiptFolder(linkedFile.linked, settings, metadataCache) : getImageLinkOptions(linkedFile.linked, settings);
		const sourcePath = getReceiptFolder(sourceFile, settings, metadataCache);
		pathInGithub = createRelativePath(sourcePath, pathInGithub);
		const regexToReplace = new RegExp(`(\\[{2}.*${linkedFile.linkFrom}.*\\]{2})|(\\[.*\\]\\(.*${linkedFile.linkFrom}.*\\))`, 'g');
		const matchedLink = fileContent.match(regexToReplace);
		if (matchedLink) {
			for (const link of matchedLink) {
				const newLink = link.replace(linkedFile.linkFrom, pathInGithub);
				fileContent = fileContent.replace(link, newLink);
			}
		}
	}
	return fileContent;
}

function creatorAltLink(altMatch: RegExpMatchArray, altCreator: string[], fileExtension: string) {
	if (altMatch) {
		return altMatch[0]
	}
	if (fileExtension === 'md') {
		return altCreator.length > 1 ? altCreator[altCreator.length-1] : altCreator[0] //alt text based on filename for markdown files
	}
	return ''
}


export {convertWikilinks, convertLinkCitation, creatorAltLink};

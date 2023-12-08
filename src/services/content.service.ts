import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { content, contentDocument } from "../schemas/content.schema";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class contentService {

    constructor(@InjectModel(content.name) private content: Model<contentDocument>, private readonly httpService: HttpService) { }

    async create(content: content): Promise<content> {
        try {
            const newcontent = new this.content(content);
            const savedData = newcontent.save();
            return savedData;
        } catch (error) {
            return error;
        }
    }

    async readAll(): Promise<content[]> {
        return await this.content.find().exec();
    }

    async readById(id): Promise<content> {
        return await this.content.findById(id).exec();
    }

    async update(id, content: content): Promise<content> {
        return await this.content.findByIdAndUpdate(id, content, { new: true })
    }

    async delete(id): Promise<any> {
        return await this.content.findByIdAndRemove(id);
    }

    async pagination(
        skip = 0,
        limit = 5,
        type,
        collectionId
    ) {
        const data = await this.content.find({ type: type, collectionId: collectionId }).limit(limit).skip(skip).exec();
        return {
            data: data,
            status: 200,
        }
    }

    async getRandomContent(
        limit = 5,
        type = 'Word',
        language = 'ta'
    ) {
        const data = await this.content.aggregate([
            {
                $match: {
                    'contentType': type,
                    'contentSourceData': {
                        $elemMatch: {
                            'language': language
                        }
                    }
                }
            },
            { $sample: { size: limit } }
        ]);
        return {
            data: data,
            status: 200,
        }
    }

    async getContentWord(
        limit = 5,
        language = 'ta'
    ) {
        const data = await this.content.aggregate([
            {
                $match: {
                    'contentType': 'Word',
                    'contentSourceData': {
                        $elemMatch: {
                            'language': language,
                        }
                    }
                }
            },
            { $sample: { size: limit } }
        ]);
        return {
            data: data,
            status: 200,
        }
    }

    async getContentSentence(
        limit = 5,
        language = 'ta'
    ) {
        const data = await this.content.aggregate([
            {
                $match: {
                    'contentType': 'Sentence',
                    'contentSourceData': {
                        $elemMatch: {
                            'language': language,
                        }
                    }
                }
            },
            { $sample: { size: limit } }
        ]);
        return {
            data: data,
            status: 200,
        }
    }

    async getContentParagraph(
        limit = 5,
        language = 'ta'
    ) {
        const data = await this.content.aggregate([
            {
                $match: {
                    'contentType': 'Paragraph',
                    'contentSourceData': {
                        $elemMatch: {
                            'language': language,
                        }
                    }
                }
            },
            { $sample: { size: limit } }
        ]);
        return {
            data: data,
            status: 200,
        }
    }

    async search(tokenArr, language = 'ta', contentType = 'Word', limit = 5): Promise<any> {
        if (tokenArr.length !== 0) {
            let searchChar = tokenArr.join("");
            const regexPattern = new RegExp(`[${searchChar}]`);
            let wordsArr = [];
            await this.content.aggregate([
                {
                    $match: {
                        "contentSourceData": {
                            $elemMatch: {
                                "text": { $regex: regexPattern }
                            }
                        },
                        "contentType": contentType
                    }
                },
                { $sample: { size: 100 } }
            ]).exec().then((doc) => {
                if (language === 'hi') {
                    let hindiVowelSignArr = ["ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "ं", "ः", "ँ", "ॉ", "ों", "्", "़", "़ा"];
                    for (let docEle of doc) {
                        let match = false;

                        let prev = '';
                        let textArr = [];
                        for (let text of docEle.contentSourceData[0]['hi']['text'].split("")) {
                            if (hindiVowelSignArr.includes(text)) {
                                let connect = prev + text;
                                textArr.pop();
                                textArr.push(connect);
                            } else {
                                textArr.push(text);
                                prev = text;
                            }
                        }

                        for (let tokenArrEle of tokenArr) {
                            for (let textArrEle of textArr) {
                                if (tokenArrEle === textArrEle) {
                                    match = true;
                                    break;
                                }
                            }
                        }
                        if (match === true) {
                            wordsArr.push(docEle);
                            if (wordsArr.length === limit) {
                                break;
                            }
                        }
                    }
                } else if (language === 'ta') {
                    let taVowelSignArr = [
                        "ா",
                        "ி",
                        "ீ",
                        "ு",
                        "ூ",
                        "ெ",
                        "ே",
                        "ை",
                        "ொ",
                        "ோ",
                        "ௌ",
                        "்",
                    ]
                    for (let docEle of doc) {
                        let match = false;

                        let prev = '';
                        let textArr = [];
                        let contentText: any = docEle.contentSourceData[0]['text'];
                        for (let text of contentText.split("")) {
                            if (taVowelSignArr.includes(text)) {
                                let connect = prev + text;
                                textArr.pop();
                                textArr.push(connect);
                            } else {
                                textArr.push(text);
                                prev = text;
                            }
                        }

                        for (let tokenArrEle of tokenArr) {
                            for (let textArrEle of textArr) {
                                if (tokenArrEle === textArrEle) {
                                    match = true;
                                    break;
                                }
                            }
                        }
                        if (match === true) {
                            wordsArr.push(docEle);
                            if (wordsArr.length === limit) {
                                break;
                            }
                        }
                    }
                }
            })

            return wordsArr;
        } else {
            return [];
        }
    }

    async charNotPresent(tokenArr): Promise<any> {
        if (tokenArr.length !== 0) {
            let searchChar = tokenArr.join("");

            const regexPattern = new RegExp(`.*${searchChar}.*`);
            let wordsArr = [];
            await this.content.find({
                $nor: [
                    { "contentSourceData.en.text": { $regex: regexPattern } },
                    { "contentSourceData.hi.text": { $regex: regexPattern } },
                    { "contentSourceData.ta.text": { $regex: regexPattern } }
                ],
                "type": "Word"
            }).limit(10).exec().then((doc => {
                let hindiVowelSignArr = ["ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "ं", "ः", "ँ", "ॉ", "ों", "्", "़", "़ा"];
                for (let docEle of doc) {
                    let match = false;

                    let prev = '';
                    let textArr = [];
                    for (let text of docEle.contentSourceData[0]['hi']['text'].split("")) {
                        if (hindiVowelSignArr.includes(text)) {
                            let connect = prev + text;
                            textArr.pop();
                            textArr.push(connect);
                        } else {
                            textArr.push(text);
                            prev = text;
                        }
                    }

                    for (let tokenArrEle of tokenArr) {
                        for (let textArrEle of textArr) {
                            if (tokenArrEle === textArrEle) {
                                match = true;
                                break;
                            }
                        }
                    }
                    if (match === false) {
                        wordsArr.push(docEle);
                    }
                }
            }));

            return wordsArr;

        } else {
            return [];
        }
    }
}
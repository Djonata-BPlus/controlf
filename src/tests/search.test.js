import GetWebviewSearchContent from "../web-views/get-webview-search.js";
import {getNonce} from '../utils/utils.js';

console.log(new GetWebviewSearchContent().html)

export default function teste()
{
    console.log(getNonce())
}
teste()
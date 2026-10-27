import {Item,uid} from './model';
/** Copies form new groups; they must never remain linked to the source group. */
export function cloneItems(items:Item[],dx=0,dy=0){const groups=new Map<string,string>();return items.map(item=>{let groupId:string|undefined;if(item.groupId){if(!groups.has(item.groupId))groups.set(item.groupId,uid());groupId=groups.get(item.groupId)}return {...item,id:uid(),x:item.x+dx,y:item.y+dy,locked:false,groupId}})}

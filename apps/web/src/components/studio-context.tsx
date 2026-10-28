"use client";
import {createContext,useContext,MutableRefObject} from 'react';
import * as THREE from 'three';
import {Item} from '@core/model';
export type StudioController={overview:MutableRefObject<boolean>;modelReady:(id:string)=>void;dragStart:MutableRefObject<((id:string,event:PointerEvent)=>void)|null>;space:MutableRefObject<boolean>;nodes:MutableRefObject<Map<string,THREE.Group>>;interacting:MutableRefObject<boolean>;setInteracting:(value:boolean)=>void;preview:(items:Item[],original:Item[])=>void};
export const StudioContext=createContext<StudioController|null>(null);
export function useStudio(){const value=useContext(StudioContext);if(!value)throw new Error('Studio controller missing');return value;}

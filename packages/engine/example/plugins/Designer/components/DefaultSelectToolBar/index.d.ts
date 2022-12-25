/// <reference types="react" />
import { CNode } from '@chameleon/model';
export declare type DefaultSelectToolBarProps = {
    nodeList: CNode[];
    toSelectNode: (id: string) => void;
    toDelete: (id: string) => void;
    toCopy: (idd: string) => void;
};
export declare const DefaultSelectToolBar: ({ nodeList, toSelectNode, toDelete, toCopy, }: DefaultSelectToolBarProps) => JSX.Element;

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';
import { CTreeContext, DragState } from './context';
import { TreeNodeData } from './dataStruct';
import styles from './style.module.scss';
import { LOGGER } from '../../../../utils/logger';
import { CNode } from '@chameleon/model';
import { Input, InputRef } from 'antd';

export const DRAG_ITEM_KEY = 'data-drag-key';

export type TreeNodeProps = {
  item: TreeNodeData;
  level?: number;
  paths?: (string | number)[];
};
export const TreeNode = (props: TreeNodeProps) => {
  const allStateRef = useRef<{ titleEditable: boolean }>({
    titleEditable: false,
  });
  const { level = 0, item, paths = ['0'] } = props;
  const [nodeVisible, setNodeVisible] = useState(true);
  const {
    state: ctxState,
    updateState,
    onSelectNode,
    onDeleteNode,
  } = useContext(CTreeContext);

  const [titleEditable, setTitleEditable] = useState(
    allStateRef.current?.titleEditable
  );
  allStateRef.current.titleEditable = titleEditable;
  const expanded = ctxState.expandKeys.find((el) => el === item.key);
  const toggleExpandNode = () => {
    let newExpandKeys = ctxState.expandKeys;
    if (expanded) {
      newExpandKeys = newExpandKeys.filter((el) => el !== item.key);
    } else {
      newExpandKeys.push(item.key || '');
    }
    updateState({
      expandKeys: newExpandKeys,
    });
  };
  const selected = ctxState.currentSelectNodeKeys.find((el) => el === item.key);
  const titleEditInputRef = useRef<InputRef>(null);
  const toggleSelectNode = () => {
    if (titleEditable) {
      titleEditInputRef?.current?.focus();
      return;
    }
    if (item.canBeSelected !== undefined && item.canBeSelected === false) {
      return;
    }
    let newKeys = ctxState.currentSelectNodeKeys;
    if (!ctxState.multiSelect) {
      if (item.key) {
        onSelectNode?.({ keys: [item.key], node: item });
      } else {
        onSelectNode?.({ keys: [], node: item });
      }

      updateState({
        currentSelectNodeKeys: [String(item.key)],
      });
      return;
    }
    if (selected) {
      newKeys = newKeys.filter((el) => el !== item.key);
    } else {
      newKeys.push(String(item.key));
    }
    onSelectNode?.({ keys: newKeys, node: item });
    updateState({
      currentSelectNodeKeys: newKeys,
    });
  };
  const singPadding = 20;
  const indent = singPadding * level;
  const canBeSelected = item.canBeSelected ?? true;

  const dragKeyProps = {
    [DRAG_ITEM_KEY]: item.key,
  };
  const updateExpandKeyRef = useRef<(key: string) => void>();
  const ctxStateRef = useRef<typeof ctxState>();
  ctxStateRef.current = ctxState;
  updateExpandKeyRef.current = (key) => {
    const oldExpandKeys = ctxState.expandKeys;
    const newExpandKeys = Array.from(new Set([...oldExpandKeys, key]));
    updateState({
      expandKeys: newExpandKeys,
    });
  };
  const domRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // auto expand on dragging
    let timerHandler = 0;
    domRef.current?.addEventListener('mouseenter', () => {
      timerHandler = window.setTimeout(() => {
        if (ctxStateRef.current?.dragState === DragState.DRAGGING) {
          updateExpandKeyRef.current?.(item.key || '');
        }
      }, 0.8 * 1000);
    });
    domRef.current?.addEventListener('mouseleave', () => {
      clearTimeout(timerHandler);
    });

    const clickHandle = (e: MouseEvent) => {
      if (allStateRef.current.titleEditable) {
        if (e.target === titleEditInputRef.current?.input) {
          return;
        }
        setTitleEditable(false);
        targetNodeModel.updateValue();
      }
    };

    document.addEventListener('click', clickHandle);

    return () => {
      if (timerHandler) {
        clearTimeout(timerHandler);
      }
      document.removeEventListener('click', clickHandle);
    };
  }, []);

  const targetNodeModel = useMemo(() => {
    return ctxState.pageModel?.getNode(item.key || '') as CNode;
  }, [item.key]);

  const toggleNodeVisible = () => {
    const newVisible = !nodeVisible;

    if (!targetNodeModel) {
      return;
    }
    const devState = targetNodeModel.value.configure.devState ?? {};
    devState.condition = newVisible;
    targetNodeModel.value.configure.devState = devState;
    targetNodeModel.updateValue();
    setNodeVisible(newVisible);
  };

  let titleView = item.title;
  if (item.titleViewRender) {
    titleView = item.titleViewRender({
      item,
      titleView: item.title,
    });
  }
  const titleText =
    targetNodeModel?.value.title || targetNodeModel?.value.componentName;

  const bodyView = (
    <div className={styles.nodeBox}>
      <div
        className={clsx([
          styles.nodeContent,
          selected && canBeSelected && styles.selected,
        ])}
        style={{ marginLeft: `${-indent}px`, paddingLeft: `${indent + 8}px` }}
        onMouseMove={() => {
          if (!item.key) {
            return;
          }
          const compInstances =
            ctxState.designerHandler?.getDynamicComponentInstances(item.key);
          if (typeof compInstances?._CONDITION !== 'undefined') {
            setNodeVisible(compInstances?._CONDITION);
          }
        }}
      >
        {item.children?.length ? (
          <span
            style={{ paddingRight: '5px' }}
            className={styles.arrowSpan}
            onClickCapture={toggleExpandNode}
          >
            <RightOutlined
              className={clsx([styles.nodeArrow, expanded && styles.expanded])}
            />
          </span>
        ) : null}
        <div
          className={styles.nodeRenderView}
          {...dragKeyProps}
          ref={domRef}
          onClick={toggleSelectNode}
          onDoubleClick={() => {
            // slot 节点，属性节点不能编辑 title
            if (!targetNodeModel) {
              return;
            }
            setTitleEditable(true);
            setTimeout(() => {
              titleEditInputRef.current?.focus();
            });
          }}
        >
          {!titleEditable && titleView}
          {titleEditable && (
            <div
              style={{
                paddingRight: '10px',
              }}
            >
              <Input
                size="small"
                maxLength={20}
                defaultValue={titleText}
                ref={titleEditInputRef}
                onPressEnter={() => {
                  setTitleEditable(false);
                  targetNodeModel.updateValue();
                }}
                onChange={(e) => {
                  targetNodeModel.value.title = e.target.value;
                }}
              />
            </div>
          )}
        </div>
        {!titleEditable && !item.rootNode && (
          <div className={styles.toolbarBox}>
            <div className={styles.iconItem}>
              {!nodeVisible && <EyeOutlined onClick={toggleNodeVisible} />}
              {nodeVisible && (
                <EyeInvisibleOutlined onClick={toggleNodeVisible} />
              )}
            </div>
            <div
              className={styles.iconItem}
              onClick={() => {
                onDeleteNode(item.key || '');
              }}
            >
              <DeleteOutlined />
            </div>
          </div>
        )}
      </div>
      <div
        className={clsx([styles.nodeChildren, selected && styles.selected])}
        style={{
          paddingLeft: `${singPadding}px`,
          height: expanded ? 'auto' : '0',
        }}
      >
        {expanded &&
          item.children?.map((el, index) => {
            const key = `${el.key}-${index}`;
            return (
              <TreeNode
                key={key}
                item={el}
                paths={[...paths, index]}
                level={level + 1}
              />
            );
          })}
      </div>
    </div>
  );
  if (item.containerRender) {
    const containerView = item.containerRender({
      item: item,
      treeNodeView: bodyView,
    });
    return containerView;
  }
  return bodyView;
};

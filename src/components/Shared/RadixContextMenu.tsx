"use client";

import * as React from "react";
import { ContextMenu } from "@radix-ui/themes";

const RadixContextMenu = {
    Root: ContextMenu.Root,
    Trigger: ContextMenu.Trigger,
    Content: ContextMenu.Content,
    Item: ContextMenu.Item,
    Separator: ContextMenu.Separator,
    Group: ContextMenu.Group,
    Portal: React.Fragment,
    Sub: ContextMenu.Sub,
    SubTrigger: ContextMenu.SubTrigger,
    SubContent: ContextMenu.SubContent,
    RadioGroup: ContextMenu.RadioGroup,
};

export default RadixContextMenu;

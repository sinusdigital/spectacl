"use client";

import * as React from "react";
import { DropdownMenu } from "@radix-ui/themes";

const Shortcut = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={`ml-auto text-xs tracking-widest opacity-60 ${className}`}
            {...props}
        />
    );
};
Shortcut.displayName = "DropdownMenuShortcut";

const RadixDropdownMenu = {
    Root: DropdownMenu.Root,
    Trigger: DropdownMenu.Trigger,
    Content: DropdownMenu.Content,
    Item: DropdownMenu.Item,
    CheckboxItem: DropdownMenu.CheckboxItem,
    RadioItem: DropdownMenu.RadioItem,
    Label: DropdownMenu.Label,
    Separator: DropdownMenu.Separator,
    Shortcut,
    Group: DropdownMenu.Group,
    Portal: React.Fragment,
    Sub: DropdownMenu.Sub,
    SubContent: DropdownMenu.SubContent,
    SubTrigger: DropdownMenu.SubTrigger,
    RadioGroup: DropdownMenu.RadioGroup,
};

export default RadixDropdownMenu;

import React, { useContext, useEffect, useState } from "react";
import { Input, Table, Typography } from "antd";

import * as lib from "@clusterio/lib";
import { PageLayout, ControlContext } from "@clusterio/web_ui";

import { SubscribableProperty } from "./subscribers";
import { UpdateCommandsEvent } from "../dist/plugin/messages";

const strcmp = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;

function CommandsPage() {
    const control = useContext(ControlContext);
    const plugin = control.plugins.get("exp_commands");
    const commands = [...plugin.commands.use().values()];

    return <PageLayout nav={[{ name: "Commands" }]}>
        <h2>Commands</h2>
        <Table
            dataSource={commands}
            rowKey={item => item.name}
            pagination={false}
            columns={[
                {
                    title: "Command",
                    key: "command",
                    sorter: (a, b) => strcmp(a.name, b.enabled),
                    defaultSortOrder: "descend",
                    render: item => item.name,
                },
                {
                    title: "Enabled",
                    key: "enabled",
                    sorter: (a, b) => {
                        if (a.enabled && !b.enabled) return -1; 
                        if (!a.enabled && b.enabled) return 1; 
                        return 0;
                    },
                    render: item => item.enabled ? "True" : "False",
                }
            ]}
        />
    </PageLayout>
}

export class WebPlugin extends lib.BaseWebPlugin {
    commands = new SubscribableProperty(UpdateCommandsEvent, new Map());

    async init() {
        this.pages = [
            {
                path: "/commands",
                sidebarName: "Commands",
                permission: "exp_commands.commands.view",
                content: <CommandsPage/>
            }
        ]
    }

    onControllerConnectionEvent(event) {
        if (event === "connect") {
            this.commands.connectControl(this.control);
        }
    }
}
import React, { useContext, useEffect, useState } from "react";
import { Input, Table, Typography } from "antd";

import * as lib from "@clusterio/lib";
import { PageLayout, ControlContext } from "@clusterio/web_ui";

import SubscribableProperty from "./subscribableProperty";
import { UpdateCommandsEvent } from "../dist/plugin/messages";

const strcmp = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;

function CommandsPage() {
    const control = useContext(ControlContext);
    const plugin = control.plugins.get("exp_commands");
    const commands = plugin.commands.use();

    return <PageLayout nav={[{ name: "Commands" }]}>
        <h2>Commands</h2>
        <Table
            dataSource={commands}
            rowKey={item => item[0]}
            pagination={false}
            columns={[
                {
                    title: "Command",
                    key: "command",
                    sorter: (a, b) => strcmp(a[0], b[0]),
                    defaultSortOrder: "descend",
                    render: item => item[0],
                },
                {
                    title: "Enabled",
                    key: "enabled",
                    sorter: (a, b) => {
                        if (a[1] && !b[1]) return -1; 
                        if (!a[1] && b[1]) return 1; 
                        return 0;
                    },
                    render: item => item[1] ? "True" : "False",
                }
            ]}
        />
    </PageLayout>
}

export class WebPlugin extends lib.BaseWebPlugin {
    async init() {
        this.pages = [
            {
                path: "/commands",
                sidebarName: "Commands",
                permission: "exp_commands.commands.view",
                content: <CommandsPage/>
            }
        ]

        this.commands = new SubscribableProperty(UpdateCommandsEvent, [], (event) => {
            return event.commands;
        });
    }

    onControllerConnectionEvent(event) {
        if (event === "connect") {
            this.commands.connectControl(this.control);
        }
    }
}
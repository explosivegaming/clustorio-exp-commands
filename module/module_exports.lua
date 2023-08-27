--[[-- Core Module - Commands
- Factorio command making module that makes commands with better parse and more modularity
@core Commands
@alias Commands

]]

local ExpUtil = require("modules/exp_util")
local Color = require("modules/exp_util/include/color")

local Commands = {
    color = Color, -- A useful reference to the color utils to be used with command outputs
    _prototype = {}, -- Contains the methods for the command object
    registered_commands = {}, -- Stores a reference to all registered commands
    permission_authorities = {}, -- Stores a reference to all active permission authorities
    data_type_parsers = {}, -- Stores all input parsers and validators for different data types
    status = {}, -- Contains the different status values a command can return
}

Commands._metatable = {
    __index = Commands._prototype,
    __class = "ExpCommand"
}

--- Status Returns.
-- Return values used by command callbacks
-- @section command-status

function Commands.status.success(msg)
    return Commands.status.success, msg or {'exp-commands.success'}
end

function Commands.status.error(msg)
    return Commands.status.error, {'exp-commands.error', msg or "Please check you gave the correct arguments."}
end

function Commands.status.unauthorised(msg)
    return Commands.status.unauthorised, msg or {'exp-commands.unauthorized'}
end

function Commands.status.invalid_input(msg)
    return Commands.status.invalid_input, {'exp-commands.invalid-input', msg or "Please ensure everything is formated correctly."}
end

function Commands.status.internal_error(msg)
    return Commands.status.internal_error, msg or {'exp-commands.internal-error'}
end

--- Permission Authority.
-- Functions that control who can use commands
-- @section permission-authority

function Commands.add_permission_authority(permission_authority)
    local next_index = #Commands.permission_authorities + 1
    Commands.permission_authorities[next_index] = permission_authority
end

function Commands.remove_permission_authority(permission_authority)
    local pms = Commands.permission_authorities
    for index, value in pairs(pms) do
        if value == permission_authority then
            local last = #pms
            pms[index] = pms[last]
            pms[last] = nil
            return
        end
    end
end

function Commands.player_has_permission(player, command)
    if player == nil then return true end

    for _, permission_authority in ipairs(Commands.permission_authorities) do
        local status, msg = permission_authority(player, command)
        if status ~= true and status ~= Commands.status.success then
            if msg == nil then msg = {'expcore-commands.unauthorized'} end
            return false, msg
        end
    end

    return true, nil
end

--- Data Type Parsing.
-- Functions that parse and validate player input
-- @section input-parse-and-validation

function Commands.add_input_parser(data_type, parser)
    if Commands.data_type_parsers[data_type] then
        error("Data type \""..tostring(data_type).."\" already has a parser registered", 2)
    end
    Commands.data_type_parsers[data_type] = parser
end

function Commands.remove_input_parser(data_type)
    Commands.data_type_parsers[data_type] = nil
end

function Commands.parse_data_type(data_type, input, player, ...)
    local parser = Commands.data_type_parsers[data_type]
    if parser == nil then
        -- failure, error_type, error_msg
        return false, Commands.status.internal_error, "Data type \""..tostring(data_type).."\" does not have a registered parser"
    end

    local status, rtn = parser(player, input, ...)
    if status == Commands.status.success then
        return true, rtn -- success, parsed_data
    elseif status == Commands.status.error or status == Commands.status.invalid_input then
        return false, status, rtn -- failure, error_type, error_msg
    else
        return true, status -- success, parsed_data
    end
end

--- List and Search
-- Functions used to list and search for commands
-- @section list-and-search

function Commands.list_all()
    return Commands.registered_commands
end

function Commands.list_for_player(player)
    local rtn = {}

    for name, command in pairs(Commands.registered_commands) do
        if Commands.player_has_permission(player, command) then
            rtn[name] = command
        end
    end

    return rtn
end

local function search_commands(keyword, custom_commands)
    keyword = keyword:lower()
    local rtn = {}

    -- Search all custom commands
    for name, command in pairs(custom_commands) do
        local search = string.format('%s %s %s', name, command.help, table.concat(command.aliases, ' '))
        if search:lower():match(keyword) then
            rtn[name] = command
        end
    end

    -- Search all game commands
    for name, description in pairs(commands.game_commands) do
        local search = string.format('%s %s', name, description)
        if search:lower():match(keyword) then
            rtn[name] = {
                name = name,
                help = description,
                description = "",
                aliases = {}
            }
        end
    end

    return rtn
end

function Commands.search_all(keyword)
    return search_commands(keyword, Commands.list_all())
end

function Commands.search_for_player(keyword, player)
    return search_commands(keyword, Commands.list_for_player(player))
end

--- Command Output
-- Prints output to the player or rcon connection
-- @section player-print

function Commands.get_actor_name()
    return game.player and game.player.name or "<server>"
end

function Commands.get_actor_output()
    return game.player and game.player.print or rcon.print
end

function Commands.set_chat_message_color(message, color)
    local color_tag = math.round(color.r, 3)..', '..math.round(color.g, 3)..', '..math.round(color.b, 3)
    return string.format('[color=%s]%s[/color]', color_tag, message)
end

function Commands.set_locale_chat_message_color(message, color)
    local color_tag = math.round(color.r, 3)..', '..math.round(color.g, 3)..', '..math.round(color.b, 3)
    return {'color-tag', color_tag, message}
end

function Commands.format_player_name(player)
    local player_name = player and player.name or "<server>"
    local player_color = player and player.chat_color or { r=1, g=1, b=1 }
    local color_tag = math.round(player_color.r, 3)..', '..math.round(player_color.g, 3)..', '..math.round(player_color.b, 3)
    return string.format('[color=%s]%s[/color]', color_tag, player_name)
end

function Commands.format_locale_player_name(player)
    local player_name = player and player.name or "<server>"
    local player_color = player and player.chat_color or { r=1, g=1, b=1 }
    local color_tag = math.round(player_color.r, 3)..', '..math.round(player_color.g, 3)..', '..math.round(player_color.b, 3)
    return {'color-tag', color_tag, player_name}
end

function Commands.print(message, color)
    local formatted = ExpUtil.format_any(message)
    local player = game.player
    if not player then
        rcon.print(formatted)
    else
        player.print(formatted, color)
        player.play_sound{path='utility/scenario_message'}
    end
end

--- Command Prototype
-- The prototype defination for command objects
-- @section command-prototype

local function default_command_callback()
    return Commands.internal_error, 'No callback registered'
end

local function command_error_handler(err)
    return Commands.internal_error, debug.traceback(err)
end

function Commands.new(name, help)
    ExpUtil.assert_argument_types("string", "string")
    if Commands.registered_commands[name] then
        error("Command is already defined at: "..Commands.registered_commands[name].defined_at, 2)
    end

    return setmetatable({
        name = name,
        help = help,
        callback = default_command_callback,
        defined_at = ExpUtil.safe_file_path(2),
        auto_concat = false,
        min_arg_count = 0,
        max_arg_count = 0,
        flags   = {}, -- stores flags that can be used by auth
        aliases = {}, -- stores aliases to this command
        args  = {}, -- [{name: string, optional: boolean, default: any, data_type: function, parse_args: table}]
    }, Commands._metatable)
end

function Commands._prototype:argument(name, data_type, ...)
    self.min_arg_count = self.min_arg_count + 1
    self.max_arg_count = self.max_arg_count + 1
    self.args[#self.args + 1] = {
        name = name,
        optional = false,
        data_type = data_type,
        parse_args = {...}
    }
    return self
end

function Commands._prototype:optional(name, data_type, ...)
    self.max_arg_count = self.max_arg_count + 1
    self.args[#self.args + 1] = {
        name = name,
        optional = true,
        data_type = data_type,
        parse_args = {...}
    }
    return self
end

function Commands._prototype:defaults(defaults)
    for name, value in pairs(defaults) do
        if self.params[name] then
            self.params[name].default = value
        end
    end
    return self
end

function Commands._prototype:flags(flags)
    for name, value in pairs(flags) do
        if type(name) == "number" then
            self.flags[value] = true
        else
            self.flags[name] = value
        end
    end
    return self
end

function Commands._prototype:aliases(aliases)
    local start_index = #self.aliases
    for index, alias in ipairs(aliases) do
        self.aliases[start_index + index] = alias
    end
    return self
end

function Commands._prototype:enable_auto_concatenation()
    self.auto_concat = true
    return self
end

function Commands._prototype:register(callback)
    Commands.registered_commands[self.name] = self
    self.callback = callback

    -- Generates a description to be used
    local description = {}
    for index, argument in pairs(self.args) do
        if argument.optional then
            description[index] = "["..argument.name.."]"
        else
            description[index] = "<"..argument.name..">"
        end
    end
    self.description = table.concat(description, " ")

    -- Callback which is called by the game engine
    local function command_callback(event)
        event.name = self.name
        xpcall(Commands._event_handler, command_error_handler, event)
    end

    -- Registers the command under its own name
    local help = {'exp-commands.command-help', self.description, self.help}
    commands.add_command(self.name, help, command_callback)

    -- Registers the command under its aliases
    for _, alias in ipairs(self.aliases) do
        commands.add_command(alias, help, command_callback)
    end
end

return Commands
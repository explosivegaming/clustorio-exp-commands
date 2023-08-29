
local Global = require("modules/exp_util/global")
local Commands = require("modules/exp_commands/module_exports")
local add, allow, deny = Commands.add_permission_authority, Commands.status.success, Commands.status.unauthorised

local system_players = {}
local disabled_commands = {}
Global.register({
    system_players,
    disabled_commands,
}, function(tbl)
    system_players = tbl[1]
    disabled_commands = tbl[2]
end)

--- Allow a player access to system commands, use for debug purposes only
-- @tparam[opt] string player_name The name of the player to give access to, default is the current player
function Commands.unlock_system(player_name)
    system_players[player_name or game.player.name] = true
end

--- Remove access from system commands for a player, use for debug purposes only
-- @tparam[opt] string player_name The name of the player to give access to, default is the current player
function Commands.lock_system(player_name)
    system_players[player_name or game.player.name] = nil
end

--- Stops a command from be used by any one
-- @tparam string command_name The name of the command to disable
function Commands.disable(command_name)
    disabled_commands[command_name] = true
end

--- Allows a command to be used again after disable was used
-- @tparam string command_name The name of the command to enable
function Commands.enable(command_name)
    disabled_commands[command_name] = nil
end

--- If a command has the flag "admin_only" then only admins can use the command
add(function(player, command)
    if command.flags.admin_only and not player.admin then
        return deny{"exp-commands.reject-admin-only"}
    else
        return allow()
    end
end)

--- If a command has the flag "system_only" then only rcon connections can use the command
add(function(player, command)
    if command.flags.system_only and not system_players[player.name] then
        return deny{"exp-commands.reject-system-only"}
    else
        return allow()
    end
end)

--- If a command has the flag "no_rcon" then rcon connections can not use the command
add(function(player, command)
    if command.flags.no_rcon and player == nil then
        return deny("Rcon connections can not use this command")
    else
        return allow()
    end
end)

--- If a command has the flag "disabled" or Commands.disable was called, then no one can use the command
add(function(_, command)
    if command.flags.disabled or disabled_commands[command.name] then
        return deny{"exp-commands.reject-disabled"}
    else
        return allow()
    end
end)
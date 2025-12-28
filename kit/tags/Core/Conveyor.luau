--!strict

-- WELCOME TO HELL: COMMENT CORE MECHANIC WARNING

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local std = require(ReplicatedStorage:WaitForChild("KitStd"))
local prelude = std.prelude

local conveyors = {}

--- @class Conveyor
--- @tag KitObject
--- Conveyors speeds contacting objects facing it's direction.
local Conveyor = {}
type Self = typeof(Conveyor)
Conveyor.implements = { Tagged = true, OnTick = true }
Conveyor.tag = "Conveyor"
Conveyor.tagCheck = prelude.isBasePart

--- @prop Speed number
--- @within Conveyor
--- @tag Attribute
---
--- The speed in studs per second that objects move along the conveyor.
Conveyor.Speed = prelude.attribute("Speed", prelude.isPositiveNumber, 0)

--- @prop SynchronizeConveyorBeams boolean
--- @within Conveyor
--- @tag Attribute
---
--- If true, the conveyor will update all Beam objects named "ConveyorBeam" to
--- move at the same pace as the `Speed` attribute.
Conveyor.SynchronizeConveyorBeams = prelude.attribute("SynchronizeConveyorBeams", prelude.isBoolean, true)

function Conveyor.tagged(self: Self, trove: std.Trove, tagged: BasePart)
	conveyors[tagged] = true
	trove:add(function()
		conveyors[tagged] = false
	end)
end

function Conveyor.onTick(self: Self, dt: number)
	debug.profilebegin("Conveyor")
	local alreadySynchronized: std.Set<Instance> = {}
	for conveyor in conveyors do
		local speed: number = prelude.Enabled(conveyor) and self.Speed(conveyor) or 0
		conveyor.AssemblyLinearVelocity = conveyor.CFrame.LookVector * speed
		if self.SynchronizeConveyorBeams(conveyor) then
			for _, beam in (conveyor:GetDescendants() :: any) :: { Beam } do
				if not alreadySynchronized[beam] then
					if beam.Name == "ConveyorBeam" and beam.ClassName == "Beam" then
						beam.TextureSpeed = speed / beam.TextureLength
					end
					alreadySynchronized[beam] = true
				end
			end
		end
	end
	table.clear(alreadySynchronized)
	debug.profileend()
end

return Conveyor

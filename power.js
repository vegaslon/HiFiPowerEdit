/*
PowerEditor

Created by Wolfgang
on  30/9/2017

 * @license
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.

*/
(function() {


    Messages.subscribe("selection-events");
    Messages.subscribe("io.wlf.hifi.poweredit");

    Messages.messageReceived.connect(handleEntitySelectionToolUpdates);

    function handleEntitySelectionToolUpdates(channel, message, sender) {
        if (sender !== MyAvatar.sessionUUID){
        	return;
        }

        var json;
        try {
            json = JSON.parse(message);
        } catch (err) {
            print("error -- gotWrongSelectMessage: " + message);
            return;
        }
        if(channel === "selection-events"){
        	if (json.action == "selected") {
            	sendData(json.ids[0]);
        	}
    	} else if (channel === "io.wlf.hifi.poweredit"){
    		if(json.action == "poweredit"){
    			sendData(json.id);
    			setWebState(true);
    		}
    	}
    }

    var html = Script.resolvePath("html/editor.html?" + Date.now());

    var isActive = false;
    var isPicker = false;

    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
    //print(JSON.stringify(Object.keys(tablet)));
    var button = tablet.addButton({
        icon: "https://wolfgangs.github.io/HiFiPowerEdit/spanner-white.svg",
        activeIcon: "https://wolfgangs.github.io/HiFiPowerEdit/spanner.svg",
        text: "Editor",
        isActive: false,
        sortOrder: 30
    });


    var editorUI = new OverlayWebWindow({
        title: "Editor",
        source: html,
        width: 500,
        height: 800,
        visible: false
    });

    //print(JSON.stringify(Object.keys(editorUI)));

    function toggleWebState() {
    	setWebState(!isActive);
    }

    function setWebState(on){
    	if(on === isActive)return;
    	isActive = on;
        editorUI.setVisible(isActive);
        button.editProperties({ isActive: isActive });
    }

    button.clicked.connect(toggleWebState);

    editorUI.visibleChanged.connect(function(){
    	setWebState(editorUI.isVisible());
    });

    editorUI.webEventReceived.connect(function(msg) {
        msg = JSON.parse(msg);
        if(msg.type === "picker"){
        	isPicker = true;
        } else if(msg.type === "jsonData") {
        	//print(JSON.stringify(msg));
        	if(msg.data.props.hasOwnProperty("id")){
        		delete msg.data.props["id"];
        	}
        	if(msg.data.props.hasOwnProperty("userData")){
        		//msg.data.props.userData = JSON.stringify(msg.data.props.userData);
        	}
        	Entities.editEntity(msg.data.id,msg.data.props);
        } else if(msg.type === "jsonDataRequest"){
        	sendData(msg.data);
        }
    });


    Script.scriptEnding.connect(function() {
    	Controller.mouseReleaseEvent.disconnect(mouseReleaseEvent);
        button.clicked.disconnect(toggleWebState);
        tablet.removeButton(button);
    });



    function sendScriptEvent(type, data) {
        if (editorUI != null) {
            editorUI.emitScriptEvent(JSON.stringify({ type: type, data: data }));
        }
    }

    function mouseReleaseEvent(event) {
        if (!isActive || !isPicker){return;}
        isPicker = false;
        var clicked = findClickedEntity(event);
        if(clicked === null || clicked === undefined){return;}
        sendData(clicked.entityID);
    }

    function sendData(id){
    	var data = Entities.getEntityProperties(id);

    	data.userData = JSON.parse(data.userData);
    	data.locked = data.locked == 1;
    	data.dynamic = data.dynamic == 1;
    	data.visible = data.visible == 1;

        sendScriptEvent("jsonData", data);
    }

    Controller.mouseReleaseEvent.connect(mouseReleaseEvent);

    function findClickedEntity(event) {
        var pickZones = event.isControl;

        if (pickZones) {
            Entities.setZonesArePickable(true);
        }

        var pickRay = Camera.computePickRay(event.x, event.y);

        var overlayResult = Overlays.findRayIntersection(pickRay, true, [HMD.tabletID, HMD.tabletScreenID, HMD.homeButtonID]);
        if (overlayResult.intersects) {
            return null;
        }

        var entityResult = Entities.findRayIntersection(pickRay, true); // want precision picking
        //var iconResult = entityIconOverlayManager.findRayIntersection(pickRay);
        //iconResult.accurate = true;

        if (pickZones) {
            Entities.setZonesArePickable(false);
        }

        var result;

        /*if (iconResult.intersects) {
            result = iconResult;
        } else */if (entityResult.intersects) {
            result = entityResult;
        } else {
            return null;
        }

        if (!result.accurate) {
            return null;
        }

        var foundEntity = result.entityID;
        return {
            pickRay: pickRay,
            entityID: foundEntity,
            intersection: result.intersection
        };
    }

})();